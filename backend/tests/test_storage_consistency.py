import json
import sys
import tempfile
import types
import unittest
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


class DummyVectorizer:
    def __init__(self, *args, **kwargs):
        self.kwargs = kwargs

    def fit_transform(self, texts):
        return {"texts": list(texts)}

    def transform(self, texts):
        return list(texts)


def _install_dependency_stubs() -> None:
    if "jieba" not in sys.modules:
        jieba_module = types.ModuleType("jieba")
        jieba_module.cut = lambda text, cut_all=False: text.split()
        sys.modules["jieba"] = jieba_module

    if "numpy" not in sys.modules:
        numpy_module = types.ModuleType("numpy")
        numpy_module.load = lambda path: []
        numpy_module.argsort = lambda values: list(range(len(values)))
        sys.modules["numpy"] = numpy_module

    if "scipy" not in sys.modules:
        scipy_module = types.ModuleType("scipy")
        sparse_module = types.ModuleType("scipy.sparse")

        def save_npz(path: str, matrix) -> None:
            Path(path).write_bytes(repr(matrix).encode("utf-8"))

        sparse_module.save_npz = save_npz
        sparse_module.load_npz = lambda path: []
        scipy_module.sparse = sparse_module
        sys.modules["scipy"] = scipy_module
        sys.modules["scipy.sparse"] = sparse_module

    if "sklearn" not in sys.modules:
        sklearn_module = types.ModuleType("sklearn")
        feature_extraction_module = types.ModuleType("sklearn.feature_extraction")
        text_module = types.ModuleType("sklearn.feature_extraction.text")
        metrics_module = types.ModuleType("sklearn.metrics")
        pairwise_module = types.ModuleType("sklearn.metrics.pairwise")

        text_module.TfidfVectorizer = DummyVectorizer
        pairwise_module.cosine_similarity = lambda query_vec, matrix: [[0.0] * len(matrix)]
        metrics_module.pairwise = pairwise_module
        feature_extraction_module.text = text_module
        sklearn_module.feature_extraction = feature_extraction_module
        sklearn_module.metrics = metrics_module

        sys.modules["sklearn"] = sklearn_module
        sys.modules["sklearn.feature_extraction"] = feature_extraction_module
        sys.modules["sklearn.feature_extraction.text"] = text_module
        sys.modules["sklearn.metrics"] = metrics_module
        sys.modules["sklearn.metrics.pairwise"] = pairwise_module


_install_dependency_stubs()

from services import file_processor, knowledge_service


class DummyUploadFile:
    def __init__(self, chunks: list[bytes]):
        self._chunks = list(chunks)

    async def read(self, size: int = -1) -> bytes:
        if not self._chunks:
            return b""
        return self._chunks.pop(0)


class FileProcessorTests(unittest.IsolatedAsyncioTestCase):
    async def test_stream_upload_limit_cleans_temp_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            destination = Path(temp_dir) / "uploads" / "sample.txt"
            upload = DummyUploadFile([b"abc", b"def"])

            with self.assertRaisesRegex(ValueError, "50 MiB"):
                await file_processor.stream_upload_to_path(upload, destination, max_bytes=5, chunk_size=2)

            self.assertFalse(destination.exists())
            self.assertEqual(list(destination.parent.glob(".*.tmp")), [])


class EncodingDetectionTests(unittest.TestCase):
    def test_extract_text_prefers_bom_and_gbk(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            utf8_sig_file = Path(temp_dir) / "utf8sig.txt"
            utf8_sig_file.write_bytes("你好".encode("utf-8-sig"))
            self.assertEqual(file_processor._extract_text(utf8_sig_file), "你好")

            utf16_file = Path(temp_dir) / "utf16.txt"
            utf16_file.write_bytes("世界".encode("utf-16"))
            self.assertEqual(file_processor._extract_text(utf16_file), "世界")

            gbk_file = Path(temp_dir) / "gbk.txt"
            gbk_file.write_bytes("中文".encode("gbk"))
            self.assertEqual(file_processor._extract_text(gbk_file), "中文")


class KnowledgeServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.uploads_dir = self.root / "uploads"
        self.knowledge_dir = self.root / "knowledge_store"
        self.uploads_dir.mkdir()
        self.knowledge_dir.mkdir()

        self.original_get_storage_dirs = knowledge_service.get_storage_dirs
        knowledge_service.get_storage_dirs = lambda: (self.uploads_dir, self.knowledge_dir)

    def tearDown(self):
        knowledge_service.get_storage_dirs = self.original_get_storage_dirs
        self.temp_dir.cleanup()

    def _write_index_files(self, files_index: list[dict], chunks: list[dict]) -> None:
        (self.knowledge_dir / "files_index.json").write_text(
            json.dumps(files_index, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        (self.knowledge_dir / "chunks.json").write_text(
            json.dumps(chunks, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def test_persist_knowledge_state_writes_expected_artifacts(self):
        files_index = [
            {
                "id": "file-1",
                "filename": "demo.txt",
                "file_size": 4,
                "chunk_count": 1,
                "upload_time": "2026-04-21T00:00:00",
                "file_type": ".txt",
            }
        ]
        chunks = [
            {
                "file_id": "file-1",
                "source_file": "demo.txt",
                "text": "hello world",
                "chunk_index": 0,
            }
        ]

        knowledge_service._persist_knowledge_state(files_index, chunks)

        self.assertTrue((self.knowledge_dir / "files_index.json").exists())
        self.assertTrue((self.knowledge_dir / "chunks.json").exists())
        self.assertTrue((self.knowledge_dir / "vectorizer.pkl").exists())
        self.assertTrue((self.knowledge_dir / "tfidf_matrix.npz").exists())

    def test_reprocess_keeps_old_chunks_when_text_is_empty(self):
        file_info = {
            "id": "file-1",
            "filename": "demo.txt",
            "file_size": 4,
            "chunk_count": 1,
            "upload_time": "2026-04-21T00:00:00",
            "file_type": ".txt",
        }
        original_chunks = [
            {
                "file_id": "file-1",
                "source_file": "demo.txt",
                "text": "old chunk",
                "chunk_index": 0,
            }
        ]
        self._write_index_files([file_info], original_chunks)
        (self.uploads_dir / "demo.txt").write_text("placeholder", encoding="utf-8")

        original_extract_text = knowledge_service.extract_text
        knowledge_service.extract_text = lambda path: ""
        self.addCleanup(setattr, knowledge_service, "extract_text", original_extract_text)

        result = knowledge_service.reprocess_all_files()

        self.assertEqual(result["reprocessed"], 0)
        self.assertEqual(result["total_chunks"], 1)
        self.assertEqual(len(result["errors"]), 1)
        self.assertEqual(knowledge_service._load_chunks(), original_chunks)
        self.assertEqual(knowledge_service._load_files_index()[0]["chunk_count"], 1)

    def test_delete_file_restores_uploaded_file_when_persist_fails(self):
        file_info = {
            "id": "file-1",
            "filename": "demo.txt",
            "file_size": 4,
            "chunk_count": 1,
            "upload_time": "2026-04-21T00:00:00",
            "file_type": ".txt",
        }
        chunks = [
            {
                "file_id": "file-1",
                "source_file": "demo.txt",
                "text": "old chunk",
                "chunk_index": 0,
            }
        ]
        self._write_index_files([file_info], chunks)

        upload_path = self.uploads_dir / "demo.txt"
        upload_path.write_text("body", encoding="utf-8")

        original_persist = knowledge_service._persist_knowledge_state

        def fail_persist(*args, **kwargs):
            raise RuntimeError("persist failed")

        knowledge_service._persist_knowledge_state = fail_persist
        self.addCleanup(setattr, knowledge_service, "_persist_knowledge_state", original_persist)

        with self.assertRaisesRegex(RuntimeError, "persist failed"):
            knowledge_service.delete_file("file-1")

        self.assertTrue(upload_path.exists())
        self.assertEqual(upload_path.read_text(encoding="utf-8"), "body")
        self.assertFalse(any(path.name.endswith(".delete") for path in self.uploads_dir.iterdir()))


if __name__ == "__main__":
    unittest.main()

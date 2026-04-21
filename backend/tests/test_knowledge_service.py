import asyncio
import json
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services import file_processor, knowledge_service


def make_storage_dirs(root: Path) -> tuple[Path, Path]:
    uploads = root / "uploads"
    knowledge = root / "knowledge_store"
    uploads.mkdir(parents=True, exist_ok=True)
    knowledge.mkdir(parents=True, exist_ok=True)
    return uploads, knowledge


def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def test_process_uploaded_file_rolls_back_on_index_failure(tmp_path, monkeypatch):
    uploads_dir, knowledge_dir = make_storage_dirs(tmp_path)
    monkeypatch.setattr(knowledge_service, "get_storage_dirs", lambda: (uploads_dir, knowledge_dir))

    file_path = uploads_dir / "sample.txt"
    file_path.write_text("first line\nsecond line", encoding="utf-8")

    def break_tfidf(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(knowledge_service, "_stage_tfidf_artifacts", break_tfidf)

    with pytest.raises(RuntimeError):
        knowledge_service.process_uploaded_file("sample.txt", file_path, file_path.stat().st_size)

    assert not (knowledge_dir / "files_index.json").exists()
    assert not (knowledge_dir / "chunks.json").exists()


def test_reprocess_keeps_previous_chunks_when_extraction_fails(tmp_path, monkeypatch):
    uploads_dir, knowledge_dir = make_storage_dirs(tmp_path)
    monkeypatch.setattr(knowledge_service, "get_storage_dirs", lambda: (uploads_dir, knowledge_dir))

    file_path = uploads_dir / "sample.txt"
    file_path.write_text("alpha beta gamma", encoding="utf-8")
    knowledge_service.process_uploaded_file("sample.txt", file_path, file_path.stat().st_size)

    old_files = load_json(knowledge_dir / "files_index.json")
    old_chunks = load_json(knowledge_dir / "chunks.json")

    monkeypatch.setattr(knowledge_service, "extract_text", lambda _: "")

    result = knowledge_service.reprocess_all_files()
    new_files = load_json(knowledge_dir / "files_index.json")
    new_chunks = load_json(knowledge_dir / "chunks.json")

    assert result["reprocessed"] == 0
    assert len(result["errors"]) == 1
    assert new_chunks == old_chunks
    assert new_files[0]["chunk_count"] == old_files[0]["chunk_count"]


def test_extract_text_supports_utf16_without_bom(tmp_path):
    file_path = tmp_path / "utf16.txt"
    file_path.write_bytes("hello 你好".encode("utf-16-le"))

    extracted = file_processor.extract_text(file_path)

    assert extracted == "hello 你好"


def test_stream_upload_to_path_rejects_oversized_file(tmp_path):
    destination = tmp_path / "large.txt"

    class FakeUpload:
        def __init__(self):
            self._chunks = [b"ab", b"cd"]

        async def read(self, _size: int):
            if not self._chunks:
                return b""
            return self._chunks.pop(0)

    with pytest.raises(file_processor.FileTooLargeError):
        asyncio.run(
            file_processor.stream_upload_to_path(FakeUpload(), destination, max_bytes=3, chunk_size=2)
        )

    assert not destination.exists()

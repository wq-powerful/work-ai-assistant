import json
import os
import re
import uuid
import pickle
from datetime import datetime
from pathlib import Path

import jieba
import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from config import get_storage_dirs
from services.file_processor import extract_text


def _get_storage_paths() -> dict[str, Path]:
    uploads_dir, knowledge_dir = get_storage_dirs()
    return {
        "uploads_dir": uploads_dir,
        "chunks_file": knowledge_dir / "chunks.json",
        "vectorizer_file": knowledge_dir / "vectorizer.pkl",
        "tfidf_matrix_file": knowledge_dir / "tfidf_matrix.npz",
        "tfidf_matrix_file_legacy": knowledge_dir / "tfidf_matrix.npy",
        "files_index_file": knowledge_dir / "files_index.json",
    }


def _build_temp_path(destination: Path) -> Path:
    return destination.parent / f".{destination.name}.{uuid.uuid4().hex}.tmp"


def _build_tfidf_artifacts(chunks: list[dict]) -> tuple[object, object] | None:
    if not chunks:
        return None

    texts = [c["text"] for c in chunks]
    vectorizer = TfidfVectorizer(
        max_features=10000,
        stop_words=None,
        ngram_range=(1, 2),
        tokenizer=_chinese_tokenizer,
        token_pattern=None,
    )
    tfidf_matrix = vectorizer.fit_transform(texts)
    return vectorizer, tfidf_matrix


def _stage_json_write(destination: Path, payload: list[dict]) -> Path:
    temp_path = _build_temp_path(destination)
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    return temp_path


def _stage_tfidf_artifacts(
    chunks: list[dict], paths: dict[str, Path] | None = None
) -> tuple[list[tuple[Path, Path]], list[Path]]:
    storage = paths or _get_storage_paths()
    vectorizer_file = storage["vectorizer_file"]
    tfidf_matrix_file = storage["tfidf_matrix_file"]
    tfidf_matrix_file_legacy = storage["tfidf_matrix_file_legacy"]

    artifacts = _build_tfidf_artifacts(chunks)
    if artifacts is None:
        return [], [vectorizer_file, tfidf_matrix_file, tfidf_matrix_file_legacy]

    vectorizer, tfidf_matrix = artifacts
    vectorizer_temp = _build_temp_path(vectorizer_file)
    matrix_temp = tfidf_matrix_file.parent / f".{tfidf_matrix_file.name}.{uuid.uuid4().hex}.tmp.npz"

    try:
        with open(vectorizer_temp, "wb") as f:
            pickle.dump(vectorizer, f)
            f.flush()
            os.fsync(f.fileno())
        sparse.save_npz(str(matrix_temp), tfidf_matrix)
        return [
            (vectorizer_temp, vectorizer_file),
            (matrix_temp, tfidf_matrix_file),
        ], [tfidf_matrix_file_legacy]
    except Exception:
        vectorizer_temp.unlink(missing_ok=True)
        matrix_temp.unlink(missing_ok=True)
        raise


def _persist_knowledge_state(
    files_index: list[dict], chunks: list[dict], paths: dict[str, Path] | None = None
) -> None:
    storage = paths or _get_storage_paths()
    staged_files: list[tuple[Path, Path]] = []
    cleanup_paths: list[Path] = []

    try:
        staged_files.extend(
            [
                (_stage_json_write(storage["chunks_file"], chunks), storage["chunks_file"]),
                (_stage_json_write(storage["files_index_file"], files_index), storage["files_index_file"]),
            ]
        )
        tfidf_staged_files, tfidf_cleanup_paths = _stage_tfidf_artifacts(chunks, storage)
        staged_files.extend(tfidf_staged_files)
        cleanup_paths.extend(tfidf_cleanup_paths)

        for temp_path, destination in staged_files:
            os.replace(temp_path, destination)
        for cleanup_path in cleanup_paths:
            cleanup_path.unlink(missing_ok=True)
    except Exception:
        for temp_path, _ in staged_files:
            temp_path.unlink(missing_ok=True)
        raise


def _load_files_index(paths: dict[str, Path] | None = None) -> list[dict]:
    """Load the file index from disk."""
    storage = paths or _get_storage_paths()
    files_index_file = storage["files_index_file"]
    if files_index_file.exists():
        with open(files_index_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _load_chunks(paths: dict[str, Path] | None = None) -> list[dict]:
    """Load all chunks from disk."""
    storage = paths or _get_storage_paths()
    chunks_file = storage["chunks_file"]
    if chunks_file.exists():
        with open(chunks_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _chinese_tokenizer(text: str) -> list[str]:
    """jieba 中文分词，自动处理中英文混合文本。"""
    tokens = jieba.cut(text, cut_all=False)
    result = []
    for token in tokens:
        token = token.strip()
        if not token:
            continue
        if re.match(r'^[\s\u3000-\u303f\uff00-\uffef\u2000-\u206f!"#$%&\'()*+,\-./:;<=>?@\[\]^_`{|}~]+$', token):
            continue
        result.append(token)
    return result


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks respecting sentence boundaries."""
    if not text.strip():
        return []

    # Split by sentences first (supports Chinese and English punctuation)
    sentence_endings = re.compile(r'(?<=[。！？.!?\n])\s*')
    raw_sentences = sentence_endings.split(text)
    sentences = [s.strip() for s in raw_sentences if s.strip()]

    # Build chunks from sentences
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) + 1 <= chunk_size:
            current_chunk = (current_chunk + " " + sentence).strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # If a single sentence exceeds chunk_size, split by characters
            if len(sentence) > chunk_size:
                for i in range(0, len(sentence), chunk_size - overlap):
                    sub = sentence[i : i + chunk_size]
                    if sub.strip():
                        chunks.append(sub.strip())
                current_chunk = ""
            else:
                # Start new chunk with overlap from previous
                if current_chunk and overlap > 0:
                    overlap_text = current_chunk[-overlap:]
                    current_chunk = overlap_text + " " + sentence
                else:
                    current_chunk = sentence

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def _build_chunk_records(file_id: str, filename: str, text_chunks: list[str]) -> list[dict]:
    return [
        {
            "file_id": file_id,
            "source_file": filename,
            "text": chunk,
            "chunk_index": i,
        }
        for i, chunk in enumerate(text_chunks)
    ]


def process_uploaded_file(filename: str, file_path: Path, file_size: int) -> dict:
    """Process an uploaded file: extract text, chunk, update index."""
    storage_paths = _get_storage_paths()

    # Extract text
    text = extract_text(file_path)
    if not text.strip():
        raise ValueError(f"No text content could be extracted from {filename}")

    # Create chunks
    text_chunks = _chunk_text(text)
    if not text_chunks:
        raise ValueError(f"No chunks could be created from {filename}")

    # Create file record
    file_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    file_info = {
        "id": file_id,
        "filename": filename,
        "file_size": file_size,
        "chunk_count": len(text_chunks),
        "upload_time": now,
        "file_type": file_path.suffix.lower(),
    }

    # Create chunk records
    new_chunks = _build_chunk_records(file_id, filename, text_chunks)

    # Load existing data
    files_index = _load_files_index(storage_paths)
    all_chunks = _load_chunks(storage_paths)

    # Append new data
    files_index.append(file_info)
    all_chunks.extend(new_chunks)

    _persist_knowledge_state(files_index, all_chunks, storage_paths)

    return file_info


def get_all_files() -> list[dict]:
    """Return all indexed files."""
    return _load_files_index(_get_storage_paths())


def delete_file(file_id: str) -> bool:
    """Delete a file and its chunks from the knowledge base."""
    storage_paths = _get_storage_paths()
    files_index = _load_files_index(storage_paths)
    file_info = None
    for f in files_index:
        if f["id"] == file_id:
            file_info = f
            break

    if not file_info:
        return False

    upload_path = storage_paths["uploads_dir"] / file_info["filename"]
    pending_delete_path = None
    if upload_path.exists():
        pending_delete_path = storage_paths["uploads_dir"] / (
            f".{upload_path.name}.{uuid.uuid4().hex}.delete"
        )
        os.replace(upload_path, pending_delete_path)

    updated_files_index = [f for f in files_index if f["id"] != file_id]
    all_chunks = _load_chunks(storage_paths)
    updated_chunks = [c for c in all_chunks if c["file_id"] != file_id]

    try:
        _persist_knowledge_state(updated_files_index, updated_chunks, storage_paths)
    except Exception:
        if pending_delete_path and pending_delete_path.exists():
            os.replace(pending_delete_path, upload_path)
        raise

    if pending_delete_path:
        pending_delete_path.unlink(missing_ok=True)

    return True


def reprocess_all_files() -> dict:
    """Re-extract text from all files, re-chunk, and rebuild the TF-IDF index."""
    storage_paths = _get_storage_paths()
    files_index = _load_files_index(storage_paths)
    if not files_index:
        return {"reprocessed": 0, "total_chunks": 0, "errors": []}

    existing_chunks = _load_chunks(storage_paths)
    chunks_by_file_id: dict[str, list[dict]] = {}
    for chunk in existing_chunks:
        chunks_by_file_id.setdefault(chunk["file_id"], []).append(chunk)

    updated_files_index = [dict(file_info) for file_info in files_index]
    all_chunks = []
    errors = []
    success_count = 0

    for file_info in updated_files_index:
        file_path = storage_paths["uploads_dir"] / file_info["filename"]
        if not file_path.exists():
            errors.append({"filename": file_info["filename"], "error": "文件不存在"})
            all_chunks.extend(chunks_by_file_id.get(file_info["id"], []))
            continue
        try:
            text = extract_text(file_path)
            if not text.strip():
                raise ValueError(f"No text content could be extracted from {file_info['filename']}")

            text_chunks = _chunk_text(text)
            if not text_chunks:
                raise ValueError(f"No chunks could be created from {file_info['filename']}")

            file_info["chunk_count"] = len(text_chunks)
            new_chunks = _build_chunk_records(file_info["id"], file_info["filename"], text_chunks)
            all_chunks.extend(new_chunks)
            success_count += 1
        except Exception as e:
            errors.append({"filename": file_info["filename"], "error": str(e)})
            all_chunks.extend(chunks_by_file_id.get(file_info["id"], []))

    _persist_knowledge_state(updated_files_index, all_chunks, storage_paths)

    return {
        "reprocessed": success_count,
        "total_chunks": len(all_chunks),
        "errors": errors,
    }


def search_knowledge_base(query: str, top_k: int = 5) -> list[dict]:
    """Search the knowledge base for relevant chunks using TF-IDF + cosine similarity."""
    storage_paths = _get_storage_paths()
    vectorizer_file = storage_paths["vectorizer_file"]
    tfidf_matrix_file = storage_paths["tfidf_matrix_file"]
    tfidf_matrix_file_legacy = storage_paths["tfidf_matrix_file_legacy"]

    if not vectorizer_file.exists():
        return []

    # Support both sparse (.npz) and legacy dense (.npy) formats
    if not tfidf_matrix_file.exists() and not tfidf_matrix_file_legacy.exists():
        return []

    chunks = _load_chunks(storage_paths)
    if not chunks:
        return []

    with open(vectorizer_file, "rb") as f:
        vectorizer = pickle.load(f)

    # Load matrix (prefer sparse format)
    if tfidf_matrix_file.exists():
        tfidf_matrix = sparse.load_npz(str(tfidf_matrix_file))
    else:
        tfidf_matrix = np.load(str(tfidf_matrix_file_legacy))

    # Transform query (keep sparse)
    query_vec = vectorizer.transform([query])

    # Compute similarities (cosine_similarity supports sparse input)
    similarities = cosine_similarity(query_vec, tfidf_matrix)[0]

    # Get top-K indices
    top_indices = np.argsort(similarities)[::-1][:top_k]

    results = []
    for idx in top_indices:
        if idx >= len(chunks):
            continue  # Guard against index mismatch
        score = float(similarities[idx])
        if score > 0.1:  # Minimum relevance threshold
            results.append(
                {
                    "chunk_text": chunks[idx]["text"],
                    "source_file": chunks[idx]["source_file"],
                    "score": round(score, 4),
                }
            )

    return results

import json
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


def _load_files_index(paths: dict[str, Path] | None = None) -> list[dict]:
    """Load the file index from disk."""
    storage = paths or _get_storage_paths()
    files_index_file = storage["files_index_file"]
    if files_index_file.exists():
        with open(files_index_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_files_index(index: list[dict], paths: dict[str, Path] | None = None) -> None:
    """Save the file index to disk."""
    storage = paths or _get_storage_paths()
    files_index_file = storage["files_index_file"]
    with open(files_index_file, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


def _load_chunks(paths: dict[str, Path] | None = None) -> list[dict]:
    """Load all chunks from disk."""
    storage = paths or _get_storage_paths()
    chunks_file = storage["chunks_file"]
    if chunks_file.exists():
        with open(chunks_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_chunks(chunks: list[dict], paths: dict[str, Path] | None = None) -> None:
    """Save all chunks to disk."""
    storage = paths or _get_storage_paths()
    chunks_file = storage["chunks_file"]
    with open(chunks_file, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)


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


def _rebuild_tfidf_index(
    chunks: list[dict], paths: dict[str, Path] | None = None
) -> None:
    """Rebuild the TF-IDF vectorizer and matrix from all chunks."""
    storage = paths or _get_storage_paths()
    vectorizer_file = storage["vectorizer_file"]
    tfidf_matrix_file = storage["tfidf_matrix_file"]
    tfidf_matrix_file_legacy = storage["tfidf_matrix_file_legacy"]

    if not chunks:
        # Clean up index files if no chunks remain
        for f in [vectorizer_file, tfidf_matrix_file, tfidf_matrix_file_legacy]:
            if f.exists():
                f.unlink()
        return

    texts = [c["text"] for c in chunks]
    vectorizer = TfidfVectorizer(
        max_features=10000,
        stop_words=None,
        ngram_range=(1, 2),
        tokenizer=_chinese_tokenizer,
        token_pattern=None,
    )
    tfidf_matrix = vectorizer.fit_transform(texts)

    with open(vectorizer_file, "wb") as f:
        pickle.dump(vectorizer, f)
    # Save as sparse matrix to avoid memory explosion with large datasets
    sparse.save_npz(str(tfidf_matrix_file), tfidf_matrix)
    # Clean up legacy dense format if it exists
    if tfidf_matrix_file_legacy.exists():
        tfidf_matrix_file_legacy.unlink()


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
    new_chunks = [
        {
            "file_id": file_id,
            "source_file": filename,
            "text": chunk,
            "chunk_index": i,
        }
        for i, chunk in enumerate(text_chunks)
    ]

    # Load existing data
    files_index = _load_files_index(storage_paths)
    all_chunks = _load_chunks(storage_paths)

    # Append new data
    files_index.append(file_info)
    all_chunks.extend(new_chunks)

    # Save
    _save_files_index(files_index, storage_paths)
    _save_chunks(all_chunks, storage_paths)

    # Rebuild TF-IDF index
    _rebuild_tfidf_index(all_chunks, storage_paths)

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

    # Remove uploaded file from disk
    upload_path = storage_paths["uploads_dir"] / file_info["filename"]
    if upload_path.exists():
        upload_path.unlink()

    # Remove from files index
    files_index = [f for f in files_index if f["id"] != file_id]
    _save_files_index(files_index, storage_paths)

    # Remove chunks
    all_chunks = _load_chunks(storage_paths)
    all_chunks = [c for c in all_chunks if c["file_id"] != file_id]
    _save_chunks(all_chunks, storage_paths)

    # Rebuild TF-IDF index
    _rebuild_tfidf_index(all_chunks, storage_paths)

    return True


def reprocess_all_files() -> dict:
    """Re-extract text from all files, re-chunk, and rebuild the TF-IDF index."""
    storage_paths = _get_storage_paths()
    files_index = _load_files_index(storage_paths)
    if not files_index:
        return {"reprocessed": 0, "total_chunks": 0, "errors": []}

    all_chunks = []
    errors = []
    for file_info in files_index:
        file_path = storage_paths["uploads_dir"] / file_info["filename"]
        if not file_path.exists():
            errors.append({"filename": file_info["filename"], "error": "文件不存在"})
            continue
        try:
            text = extract_text(file_path)
            text_chunks = _chunk_text(text)
            file_info["chunk_count"] = len(text_chunks)
            new_chunks = [
                {
                    "file_id": file_info["id"],
                    "source_file": file_info["filename"],
                    "text": chunk,
                    "chunk_index": i,
                }
                for i, chunk in enumerate(text_chunks)
            ]
            all_chunks.extend(new_chunks)
        except Exception as e:
            errors.append({"filename": file_info["filename"], "error": str(e)})

    _save_files_index(files_index, storage_paths)
    _save_chunks(all_chunks, storage_paths)
    _rebuild_tfidf_index(all_chunks, storage_paths)

    return {
        "reprocessed": len(files_index) - len(errors),
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

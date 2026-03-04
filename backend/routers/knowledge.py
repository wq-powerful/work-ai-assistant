import os
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

from config import get_storage_dirs
from services.knowledge_service import process_uploaded_file, get_all_files, delete_file, reprocess_all_files

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".csv", ".xlsx", ".xls", ".pptx"}


@router.post("/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    """Upload one or more files to the knowledge base."""
    results = []
    errors = []
    uploads_dir, _ = get_storage_dirs()

    for file in files:
        raw_filename = file.filename or "unknown"
        # Sanitize filename to prevent path traversal
        filename = os.path.basename(raw_filename)
        suffix = Path(filename).suffix.lower()

        if suffix not in ALLOWED_EXTENSIONS:
            errors.append({"filename": filename, "error": f"不支持的文件类型: {suffix}"})
            continue

        # Save uploaded file
        file_path = uploads_dir / filename
        # Handle duplicate filenames
        counter = 1
        original_stem = file_path.stem
        while file_path.exists():
            file_path = uploads_dir / f"{original_stem}_{counter}{suffix}"
            counter += 1

        try:
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)

            file_size = len(content)
            file_info = process_uploaded_file(file_path.name, file_path, file_size)
            results.append(file_info)

        except Exception as e:
            # Clean up partial upload
            if file_path.exists():
                file_path.unlink()
            errors.append({"filename": filename, "error": str(e)})

    return {"uploaded": results, "errors": errors}


@router.get("/files")
async def list_files():
    """List all files in the knowledge base."""
    return {"files": get_all_files()}


@router.delete("/files/{file_id}")
async def remove_file(file_id: str):
    """Delete a file from the knowledge base."""
    success = delete_file(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="文件未找到")
    return {"success": True, "message": "文件已删除"}


@router.post("/reprocess")
async def reprocess():
    """Re-extract, re-chunk, and rebuild index for all files."""
    try:
        result = reprocess_all_files()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

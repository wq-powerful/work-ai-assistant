import asyncio
import os
import uuid
import json
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse

from config import get_storage_dirs, load_config
from models.schemas import ChatRequest
from services.knowledge_service import search_knowledge_base, get_all_files
from services.llm_service import stream_chat_completion
from services.file_processor import extract_text

router = APIRouter(prefix="/api/chat", tags=["chat"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".csv", ".xlsx", ".xls", ".pptx"}


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Stream a chat response, optionally augmented with knowledge base context."""
    config = load_config()

    # Search knowledge base for relevant context
    kb_results = search_knowledge_base(request.message, top_k=config.get("top_k", 5))

    # Get the complete file list for metadata awareness
    all_files = get_all_files()

    # Build context block from knowledge base results
    context_block = ""
    has_context = False

    # Always include the file inventory so the model can answer meta-questions
    if all_files:
        file_list_lines = []
        for idx, f in enumerate(all_files, 1):
            file_list_lines.append(
                f"  {idx}. {f['filename']} (类型: {f['file_type']}, "
                f"分块数: {f['chunk_count']}, 大小: {f['file_size']} bytes)"
            )
        context_block += (
            "\n\n[Knowledge Base File Inventory]\n"
            f"知识库中共有 {len(all_files)} 个文件：\n"
            + "\n".join(file_list_lines)
            + "\n[End of File Inventory]\n"
        )
        has_context = True

    if kb_results:
        has_context = True
        context_parts = []
        for i, result in enumerate(kb_results, 1):
            context_parts.append(
                f"[Source {i}: {result['source_file']} (relevance: {result['score']})]\n"
                f"{result['chunk_text']}"
            )
        context_block += (
            "\n\n[Knowledge Base Context]\n"
            + "\n\n---\n\n".join(context_parts)
            + "\n[End of Knowledge Base Context]\n"
        )

    # Build messages
    system_prompt = config.get("system_prompt", "")
    # Instruct the model to think and respond in Chinese
    if system_prompt:
        system_prompt += "\n\n"
    system_prompt += "请始终使用中文进行思考和回答。你的所有内部思考过程（reasoning/thinking）也必须使用中文。"
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history
    for msg in request.history:
        messages.append({"role": msg.role, "content": msg.content})

    # Build user message with context
    user_content = request.message
    if context_block:
        user_content = context_block + "\n\nUser Question: " + request.message

    messages.append({"role": "user", "content": user_content})

    # Create SSE response with metadata header
    async def event_generator():
        try:
            # Send metadata as first event
            meta_payload = {"meta": {"has_context": has_context, "sources": kb_results}}
            yield f"data: {json.dumps(meta_payload, ensure_ascii=False)}\n\n"

            # Stream LLM response
            async for chunk in stream_chat_completion(messages):
                yield chunk
        except asyncio.CancelledError:
            # Client disconnected, exit gracefully
            return

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/parse-file")
async def parse_file(file: UploadFile = File(...)):
    """Parse an uploaded file and return its extracted text for chat context."""
    raw_filename = file.filename or "unknown"
    # Sanitize filename to prevent path traversal
    filename = os.path.basename(raw_filename)
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"不支持的文件类型: {ext}，支持: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Save temporarily
    temp_id = str(uuid.uuid4())[:8]
    uploads_dir, _ = get_storage_dirs()
    temp_path = uploads_dir / f"_chat_temp_{temp_id}{ext}"

    try:
        content = await file.read()
        temp_path.write_bytes(content)
        file_size = len(content)

        # Extract text
        extracted = extract_text(temp_path)

        # Limit extracted text to avoid token overflow (max ~8000 chars)
        max_chars = 8000
        if len(extracted) > max_chars:
            extracted = extracted[:max_chars] + "\n\n[... 内容已截断 ...]"

        return {
            "id": temp_id,
            "filename": filename,
            "file_size": file_size,
            "file_type": ext,
            "extracted_text": extracted,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件解析失败: {str(e)}")
    finally:
        # Clean up temp file
        if temp_path.exists():
            temp_path.unlink()

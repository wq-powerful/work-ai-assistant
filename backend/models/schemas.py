from pydantic import BaseModel, Field
from typing import Optional, List, Literal


class SettingsUpdate(BaseModel):
    api_base_url: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=1048576)
    top_k: Optional[int] = Field(None, ge=1, le=20)
    knowledge_base_path: Optional[str] = Field(None, max_length=2048)
    system_prompt: Optional[str] = None
    theme: Optional[Literal["light", "dark"]] = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=100000)
    history: list[ChatMessage] = Field(default_factory=list)


class FileInfo(BaseModel):
    id: str
    filename: str
    file_size: int
    chunk_count: int
    upload_time: str
    file_type: str


class KnowledgeContext(BaseModel):
    chunk_text: str
    source_file: str
    score: float


class ModelInfo(BaseModel):
    id: str
    object: Optional[str] = None
    owned_by: Optional[str] = None


class ModelsResponse(BaseModel):
    models: List[ModelInfo] = Field(default_factory=list)
    error: Optional[str] = None

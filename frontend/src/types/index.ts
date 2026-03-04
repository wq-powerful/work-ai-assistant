export interface ChatAttachment {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  extracted_text?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  timestamp: number;
  hasContext?: boolean;
  sources?: KnowledgeSource[];
  isStreaming?: boolean;
  attachments?: ChatAttachment[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeSource {
  chunk_text: string;
  source_file: string;
  score: number;
}

export interface FileInfo {
  id: string;
  filename: string;
  file_size: number;
  chunk_count: number;
  upload_time: string;
  file_type: string;
}

export interface UploadResult {
  uploaded: FileInfo[];
  errors: Array<{ filename: string; error: string }>;
}

export interface AppSettings {
  api_base_url: string;
  api_key: string;
  api_key_masked?: string;
  model: string;
  temperature: number;
  max_tokens: number;
  top_k: number;
  knowledge_base_path: string;
  effective_knowledge_base_path?: string;
  system_prompt: string;
  theme: 'light' | 'dark';
}

export interface ModelInfo {
  id: string;
  object?: string;
  owned_by?: string;
}

export interface ModelsResponse {
  models: ModelInfo[];
  error?: string;
}

export type ViewType = 'chat' | 'knowledge' | 'settings';

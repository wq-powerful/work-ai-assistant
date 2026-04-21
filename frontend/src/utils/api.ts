import type { AppSettings, ChatAttachment, FileInfo, ModelsResponse, UploadResult } from '../types';

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

const BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL) ?? '/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

async function readResponseBody<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 205 || !response.body) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/**
 * Fetch wrapper with error handling and timeout.
 */
async function request<T>(url: string, options?: RequestInit & { timeout?: number }): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options || {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...fetchOptions,
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorData =
        (await readResponseBody<{ detail?: string }>(response).catch(() => undefined)) ?? {};
      throw new Error(
        typeof errorData.detail === 'string' ? errorData.detail : `请求失败 (${response.status})`
      );
    }
    return readResponseBody<T>(response);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Knowledge Base ----

export async function fetchFiles(): Promise<{ files: FileInfo[] }> {
  return request('/knowledge/files');
}

export async function uploadFiles(files: File[]): Promise<UploadResult> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${BASE_URL}/knowledge/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '上传失败');
  }
  return response.json();
}

export async function deleteFile(fileId: string): Promise<void> {
  await request(`/knowledge/files/${fileId}`, { method: 'DELETE' });
}

export async function reprocessKnowledgeBase(): Promise<{ reprocessed: number; total_chunks: number; errors: Array<{ filename: string; error: string }> }> {
  return request('/knowledge/reprocess', { method: 'POST', timeout: 120000 });
}

// ---- Settings ----

export async function fetchSettings(): Promise<{ settings: AppSettings }> {
  return request('/settings');
}

export async function fetchAvailableModels(): Promise<ModelsResponse> {
  return request('/settings/models');
}

export async function updateSettings(
  settings: Partial<AppSettings>
): Promise<{ settings: AppSettings }> {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// ---- Chat File Parsing ----

export async function parseChatFile(file: File): Promise<ChatAttachment & { error?: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/chat/parse-file`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '文件解析失败');
  }
  return response.json();
}

// ---- Chat (SSE streaming) ----

export interface StreamCallbacks {
  onMeta: (meta: { has_context: boolean; sources: Array<{ chunk_text: string; source_file: string; score: number }> }) => void;
  onToken: (token: string) => void;
  onThinking: (token: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamChat(
  message: string,
  history: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    callbacks.onError(errorData.detail || `请求失败 (${response.status})`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('无法读取响应流');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let metaReceived = false;

  const processLine = (rawLine: string) => {
    const line = rawLine.replace(/\r$/, '');
    if (!line.startsWith('data: ')) return false;
    const data = line.slice(6).trim();

    if (data === '[DONE]') {
      callbacks.onDone();
      return true;
    }

    try {
      const parsed = JSON.parse(data);

      if (parsed.meta && !metaReceived) {
        metaReceived = true;
        callbacks.onMeta(parsed.meta);
        return false;
      }

      if (parsed.thinking) {
        callbacks.onThinking(parsed.thinking);
      }

      if (parsed.content) {
        callbacks.onToken(parsed.content);
      }

      if (parsed.error) {
        callbacks.onError(parsed.error);
        return true;
      }
    } catch {
      // Skip unparseable lines
    }

    return false;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (processLine(line)) {
          return;
        }
      }
    }

    if (buffer.trim()) {
      for (const line of buffer.split('\n')) {
        if (processLine(line)) {
          return;
        }
      }
    }

    callbacks.onDone();
  } finally {
    reader.releaseLock();
  }
}

import { useState, useRef, useEffect } from 'react';
import type { ChatAttachment } from '../../types';
import { parseChatFile } from '../../utils/api';
import { formatFileSize } from '../../utils/helpers';

interface ChatInputProps {
  onSend: (message: string, attachments?: ChatAttachment[]) => void;
  disabled: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.csv', '.xlsx', '.xls', '.pptx'];

export default function ChatInput({ onSend, disabled, isStreaming, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [parsing, setParsing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const handleSubmit = () => {
    if ((!input.trim() && attachments.length === 0) || disabled || parsing) return;
    onSend(input || '请分析上传的文件内容', attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setParsing(true);
    const newAttachments: ChatAttachment[] = [];

    for (const file of Array.from(files)) {
      try {
        const result = await parseChatFile(file);
        if ('error' in result && result.error) {
          // Show error but continue with other files
          console.error(`File parse error: ${result.error}`);
          continue;
        }
        newAttachments.push({
          id: result.id,
          filename: result.filename,
          file_size: result.file_size,
          file_type: result.file_type,
          extracted_text: result.extracted_text,
        });
      } catch (err) {
        console.error('File upload failed:', err);
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setParsing(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 transition-colors duration-300">
      <div className="max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto">
        {/* Unified input container */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--input-bg)] transition-all duration-200 focus-within:ring-2 focus-within:ring-brand-blue/30 focus-within:border-brand-blue focus-within:shadow-[0_0_0_4px_rgba(26,115,232,0.08)]">
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-blue"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="text-[var(--text-primary)] max-w-[150px] truncate">{att.filename}</span>
                  <span className="text-[var(--text-tertiary)]">{formatFileSize(att.file_size)}</span>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="ml-1 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Parsing indicator */}
          {parsing && (
            <div className="flex items-center gap-2 px-4 pt-3 text-xs text-[var(--text-secondary)]">
              <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              正在解析文件...
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            disabled={disabled}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:opacity-50"
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-2">
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || parsing}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-brand-blue hover:bg-[var(--bg-secondary)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="上传文件"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Send / Stop button */}
            {isStreaming ? (
              <button
                onClick={onStop}
                className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200"
                title="停止生成"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={disabled || parsing || (!input.trim() && attachments.length === 0)}
                className={`w-8 h-8 rounded-lg gradient-orange text-white flex items-center justify-center hover:shadow-lg hover:shadow-orange-500/25 active:scale-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${
                  input.trim() || attachments.length > 0 ? 'animate-subtle-pulse' : ''
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

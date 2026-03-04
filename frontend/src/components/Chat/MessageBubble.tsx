import { useState, useEffect } from 'react';
import { ReactMarkdown, remarkGfm, rehypeHighlight } from '../../utils/markdown';
import type { ChatMessage } from '../../types';
import { formatFileSize } from '../../utils/helpers';
import TypingIndicator from './TypingIndicator';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const hasThinking = !!message.thinking;

  // Auto-expand thinking during streaming, auto-collapse when done
  useEffect(() => {
    if (!isUser && hasThinking) {
      setShowThinking(!!message.isStreaming);
    }
  }, [message.isStreaming, hasThinking, isUser]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
    >
      <div className={`max-w-[75%] ${isUser ? 'order-1' : 'order-1'}`}>
        {/* Avatar + Bubble */}
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
          {/* Avatar */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
              isUser ? 'gradient-orange' : 'gradient-blue'
            }`}
          >
            {isUser ? '我' : 'AI'}
          </div>

          {/* Bubble */}
          <div className="group relative">
            <div
              className={`rounded-2xl px-4 py-3 ${
                isUser
                  ? 'gradient-orange text-white rounded-tr-sm'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-tl-sm'
              }`}
            >
              {/* Attachments display for user messages */}
              {isUser && message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {message.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/20 text-xs"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span className="max-w-[120px] truncate">{att.filename}</span>
                      <span className="opacity-70">{formatFileSize(att.file_size)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Thinking block (collapsible) */}
              {!isUser && message.thinking && (
                <div className="mb-2">
                  <button
                    onClick={() => setShowThinking(!showThinking)}
                    className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors py-1"
                  >
                    <span>💭</span>
                    <span>思考过程</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform duration-200 ${showThinking ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      showThinking ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs italic text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[400px]">
                      {message.thinking}
                    </div>
                  </div>
                </div>
              )}

              {message.isStreaming && !message.content ? (
                <TypingIndicator />
              ) : isUser ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="markdown-content text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Copy button - hover 显示 */}
            {message.content && (
              <button
                onClick={handleCopy}
                className={`absolute -bottom-3 ${isUser ? 'left-0' : 'right-0'} opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 p-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90`}
                title="复制消息"
              >
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Knowledge base indicator */}
        {!isUser && message.hasContext && message.sources && message.sources.length > 0 && (
          <div className={`mt-1.5 ml-11`}>
            <button
              onClick={() => setShowSources(!showSources)}
              className="inline-flex items-center gap-1.5 text-xs text-brand-blue hover:text-brand-blue-light transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              <span>已引用知识库 ({message.sources.length} 条)</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${showSources ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showSources && (
              <div className="mt-2 space-y-2">
                {message.sources.map((source, idx) => (
                  <div
                    key={idx}
                    className="flex rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-brand-blue/30 text-xs transition-all duration-200 animate-fade-in overflow-hidden"
                    style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'both' }}
                  >
                    <div className="w-0.5 flex-shrink-0 bg-brand-blue/60" />
                    <div className="p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-brand-blue">{source.source_file}</span>
                        <span className="text-[var(--text-tertiary)]">
                          相关度: {(source.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                        {source.chunk_text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

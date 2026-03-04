import { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useSettings } from '../../hooks/useSettings';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { exportAsMarkdown, exportAsPDF } from '../../utils/exportChat';
import { showToast } from '../common/Toast';
import type { useConversations } from '../../hooks/useConversations';

interface ChatViewProps {
  conversationState: ReturnType<typeof useConversations>;
}

export default function ChatView({ conversationState }: ChatViewProps) {
  const { messages, isStreaming, sendMessage, stopStreaming, clearMessages } = useChat(conversationState);
  const { settings, availableModels, modelsLoading, updateSettings, refreshModels } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Close export menu on click outside
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = () => setShowExportMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showExportMenu]);

  const handleModelChange = async (model: string) => {
    try {
      await updateSettings({ model });
    } catch (err) {
      const message = err instanceof Error ? err.message : '模型切换失败';
      showToast('error', message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header - always visible */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
        {/* Left: Model selector */}
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-tertiary)]"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          {availableModels.length > 0 ? (
            <select
              value={settings.model}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={isStreaming}
              className="text-xs bg-transparent border border-[var(--border-color)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {!availableModels.some((m) => m.id === settings.model) && (
                <option value={settings.model}>{settings.model}</option>
              )}
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={settings.model}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={isStreaming}
              placeholder="输入模型名称"
              className="text-xs bg-transparent border border-[var(--border-color)] rounded-lg px-2 py-1.5 w-40 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-all disabled:opacity-50"
            />
          )}
          {/* 刷新模型列表按钮 */}
          <button
            onClick={() => refreshModels()}
            disabled={modelsLoading}
            title="刷新模型列表"
            className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={modelsLoading ? 'animate-spin' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>

        {/* Right: Export + Clear buttons */}
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <>
              {/* Export dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExportMenu(!showExportMenu);
                  }}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  导出
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-xl py-1 z-50 min-w-[140px] animate-scale-in">
                    <button
                      onClick={() => {
                        exportAsMarkdown(messages);
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Markdown (.md)
                    </button>
                    <button
                      onClick={() => {
                        exportAsPDF(messages);
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      PDF（打印）
                    </button>
                  </div>
                )}
              </div>

              {/* Clear button */}
              <button
                onClick={clearMessages}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                清空对话
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-2xl gradient-mixed flex items-center justify-center mb-6 shadow-lg shadow-orange-500/25 animate-gentle-float">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3 className="font-heading text-xl font-bold mb-2 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>欢迎使用 AI 工作助手</h3>
            <p className="text-[var(--text-secondary)] text-sm max-w-md leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              你可以向我提问任何工作相关的问题。上传文档到知识库后，我会优先基于你的文档内容来回答。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {['帮我总结一下文档要点', '这个项目的关键指标是什么？', '帮我写一封工作邮件'].map(
                (hint, index) => (
                  <button
                    key={hint}
                    onClick={() => sendMessage(hint)}
                    className="px-4 py-2 rounded-full border border-[var(--border-color)] text-sm text-[var(--text-secondary)] hover:text-brand-orange hover:border-brand-orange hover:scale-105 active:scale-95 transition-all duration-200 animate-slide-in-up"
                    style={{ animationDelay: `${0.3 + index * 0.1}s`, animationFillMode: 'both' }}
                  >
                    {hint}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput onSend={sendMessage} disabled={isStreaming} isStreaming={isStreaming} onStop={stopStreaming} />
    </div>
  );
}

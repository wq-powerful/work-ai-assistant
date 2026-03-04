import { useState, useRef, useEffect } from 'react';
import type { ViewType } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import type { useConversations } from '../../hooks/useConversations';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  conversationState: ReturnType<typeof useConversations>;
}

const navItems: Array<{ key: ViewType; label: string; icon: JSX.Element }> = [
  {
    key: 'chat',
    label: '智能对话',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
  },
  {
    key: 'knowledge',
    label: '知识库',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    ),
  },
  {
    key: 'settings',
    label: '设置',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    ),
  },
];

export default function Sidebar({ activeView, onViewChange, conversationState }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const {
    conversations,
    activeId,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
  } = conversationState;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const confirmRename = () => {
    if (editingId && editTitle.trim()) {
      renameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleNewChat = () => {
    createConversation();
    onViewChange('chat');
  };

  const handleConversationClick = (id: string) => {
    switchConversation(id);
    onViewChange('chat');
  };

  return (
    <aside className="w-64 h-screen flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] transition-colors duration-300">
      {/* Logo / App Title */}
      <div className="px-5 py-5 border-b border-[var(--border-color)]">
        <div className="group flex items-center gap-3 cursor-default">
          <div className="w-9 h-9 rounded-xl gradient-mixed flex items-center justify-center transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <h1 className="font-heading text-base font-bold transition-colors duration-200 group-hover:text-brand-orange">AI 工作助手</h1>
            <p className="text-xs text-[var(--text-tertiary)]">智能知识库问答</p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-sm text-[var(--text-secondary)] hover:text-brand-orange hover:border-brand-orange hover:bg-brand-orange/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新对话
        </button>
      </div>

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {conversations.length > 0 && (
          <div className="mb-3">
            <p className="px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              对话历史
            </p>
            <div className="space-y-0.5">
              {conversations.map((conv) => {
                const isActive = activeView === 'chat' && activeId === conv.id;
                const isEditing = editingId === conv.id;

                return (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center gap-1 px-2 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--hover-bg)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]'
                    }`}
                    onClick={() => !isEditing && handleConversationClick(conv.id)}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-brand-orange" />
                    )}
                    {/* Chat icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-50"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>

                    {/* Title */}
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={confirmRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename();
                          if (e.key === 'Escape') {
                            setEditingId(null);
                            setEditTitle('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-[var(--input-bg)] border border-[var(--border-color)] rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                      />
                    ) : (
                      <span className="flex-1 min-w-0 truncate text-xs">{conv.title}</span>
                    )}

                    {/* Action buttons (visible on hover or when active) */}
                    {!isEditing && (
                      <div className={`flex items-center gap-0.5 ${isActive ? 'opacity-100' : 'opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0'} transition-all duration-200`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(conv.id, conv.title);
                          }}
                          className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                          title="重命名"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                          className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="删除"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="px-3 py-2 border-t border-[var(--border-color)]">
        {navItems.map((item) => {
          const isActive = activeView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onViewChange(item.key)}
              className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'gradient-orange text-white shadow-md shadow-orange-500/25'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white/80" />
              )}
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="px-3 py-3 border-t border-[var(--border-color)]">
        <button
          onClick={toggleTheme}
          className="group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] active:scale-[0.98] transition-all duration-200"
        >
          <span className="transition-transform duration-200 group-hover:rotate-12">
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            )}
          </span>
          <span>{theme === 'light' ? '深色模式' : '浅色模式'}</span>
        </button>
      </div>
    </aside>
  );
}

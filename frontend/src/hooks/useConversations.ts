import { useState, useCallback, useEffect, useRef } from 'react';
import type { Conversation, ChatMessage } from '../types';
import { generateId } from '../utils/helpers';

const STORAGE_KEY = 'chat_conversations';
const ACTIVE_KEY = 'active_conversation_id';

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Conversation[];
      // Strip streaming state from restored messages
      return parsed.map((c) => ({
        ...c,
        messages: c.messages.map((m) => ({ ...m, isStreaming: false })),
      }));
    }
  } catch {
    // Corrupted data, start fresh
  }
  return [];
}

function saveConversations(conversations: Conversation[]) {
  try {
    // Don't save streaming messages content that may be partial
    // Also strip extracted_text from attachments to save space
    const toSave = conversations.map((c) => ({
      ...c,
      messages: c.messages
        .filter((m) => !m.isStreaming)
        .map((m) => ({
          ...m,
          attachments: m.attachments?.map(({ extracted_text, ...rest }) => rest),
        })),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    // localStorage may be full or disabled
    console.warn('Failed to save conversations to localStorage:', e);
  }
}

function loadActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function saveActiveId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch {
    // Silently fail
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(() => {
    const saved = loadActiveId();
    const convs = loadConversations();
    // Ensure the saved activeId still exists
    if (saved && convs.some((c) => c.id === saved)) return saved;
    return convs.length > 0 ? convs[0].id : null;
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounced save to localStorage
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveConversations(conversations);
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [conversations]);

  useEffect(() => {
    saveActiveId(activeId);
  }, [activeId]);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const createConversation = useCallback((): string => {
    const id = generateId();
    const newConv: Conversation = {
      id,
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(id);
    return id;
  }, []);

  const switchConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (activeId === id) {
          const newActiveId = filtered.length > 0 ? filtered[0].id : null;
          setActiveId(newActiveId);
        }
        return filtered;
      });
    },
    [activeId]
  );

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c))
    );
  }, []);

  const updateMessages = useCallback(
    (conversationId: string, updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          const newMsgs = updater(c.messages);
          // Auto-title from first user message
          let title = c.title;
          if (title === '新对话') {
            const firstUser = newMsgs.find((m) => m.role === 'user');
            if (firstUser) {
              title = firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '...' : '');
            }
          }
          return { ...c, messages: newMsgs, title, updatedAt: Date.now() };
        })
      );
    },
    []
  );

  const clearMessages = useCallback(
    (conversationId: string) => {
      updateMessages(conversationId, () => []);
      // Reset title
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, title: '新对话' } : c))
      );
    },
    [updateMessages]
  );

  return {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
    updateMessages,
    clearMessages,
  };
}

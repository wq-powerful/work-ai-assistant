import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, ChatAttachment, KnowledgeSource } from '../types';
import { streamChat } from '../utils/api';
import { generateId } from '../utils/helpers';
import type { useConversations } from './useConversations';

type ConversationState = ReturnType<typeof useConversations>;

export function useChat(conversationState: ConversationState) {
  const { activeId, activeConversation, updateMessages, clearMessages, createConversation } =
    conversationState;
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const messages = activeConversation?.messages || [];

  const isEmptyAssistantMessage = (message: ChatMessage) =>
    message.role === 'assistant' &&
    !message.content.trim() &&
    !(message.thinking || '').trim();

  const finalizeAssistantMessage = useCallback(
    (
      conversationId: string,
      assistantId: string,
      options?: { fallbackContent?: string; removeIfEmpty?: boolean }
    ) => {
      updateMessages(conversationId, (prev) =>
        prev.flatMap((message) => {
          if (message.id !== assistantId) {
            return [message];
          }

          const nextMessage = {
            ...message,
            content: message.content || options?.fallbackContent || '',
            isStreaming: false,
          };

          if (options?.removeIfEmpty && isEmptyAssistantMessage(nextMessage)) {
            return [];
          }

          return [nextMessage];
        })
      );
    },
    [updateMessages]
  );

  const sendMessage = useCallback(
    async (content: string, attachments?: ChatAttachment[]) => {
      if (!content.trim() || isStreaming) return;

      // Cancel any previous stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Auto-create conversation if none exists
      let convId = activeId;
      if (!convId) {
        convId = createConversation();
      }

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      };

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      updateMessages(convId, (prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      // Build history (last 10 non-streaming messages for context)
      const prevMessages = activeConversation?.messages || [];
      const history = [...prevMessages, userMsg]
        .filter((m) => !m.isStreaming)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      // Build message content including attachment text
      let fullContent = content.trim();
      if (attachments && attachments.length > 0) {
        const attachmentTexts = attachments
          .filter((a) => a.extracted_text)
          .map((a) => `[Attached File: ${a.filename}]\n${a.extracted_text}`)
          .join('\n\n---\n\n');
        if (attachmentTexts) {
          fullContent = `${attachmentTexts}\n\nUser Question: ${fullContent}`;
        }
      }

      try {
        await streamChat(
          fullContent,
          history,
          {
            onMeta: (meta) => {
              updateMessages(convId!, (prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, hasContext: meta.has_context, sources: meta.sources as KnowledgeSource[] }
                    : m
                )
              );
            },
            onThinking: (token) => {
              if (abortController.signal.aborted) return;
              updateMessages(convId!, (prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, thinking: (m.thinking || '') + token } : m
                )
              );
            },
            onToken: (token) => {
              if (abortController.signal.aborted) return;
              updateMessages(convId!, (prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: m.content + token } : m
                )
              );
            },
            onDone: () => {
              abortControllerRef.current = null;
              finalizeAssistantMessage(convId!, assistantMsg.id);
              setIsStreaming(false);
            },
            onError: (error) => {
              abortControllerRef.current = null;
              finalizeAssistantMessage(convId!, assistantMsg.id, {
                fallbackContent: `错误：${error}`,
              });
              setIsStreaming(false);
            },
          },
          abortController.signal
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          abortControllerRef.current = null;
          finalizeAssistantMessage(convId!, assistantMsg.id, { removeIfEmpty: true });
          setIsStreaming(false);
          return;
        }
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        abortControllerRef.current = null;
        finalizeAssistantMessage(convId!, assistantMsg.id, {
          fallbackContent: `连接错误：${errorMessage}`,
        });
        setIsStreaming(false);
      }
    },
    [activeId, activeConversation, isStreaming, updateMessages, createConversation, finalizeAssistantMessage]
  );

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    // Remove empty assistant placeholders when the stream is stopped manually.
    if (activeId) {
      updateMessages(activeId, (prev) =>
        prev.flatMap((message) => {
          if (!message.isStreaming) {
            return [message];
          }

          if (isEmptyAssistantMessage(message)) {
            return [];
          }

          return [{ ...message, isStreaming: false }];
        })
      );
    }
  }, [activeId, updateMessages]);

  const handleClearMessages = useCallback(() => {
    if (activeId) {
      clearMessages(activeId);
    }
  }, [activeId, clearMessages]);

  return { messages, isStreaming, sendMessage, stopStreaming, clearMessages: handleClearMessages };
}

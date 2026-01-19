import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Conversation, Message, SessionInfo } from '@/types/chat';

interface ChatContextValue {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation | null) => void;
  createConversation: (conversation: Conversation) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (updates: Partial<Message>) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  renameConversation: (conversationId: string, title: string) => void;
  setConversationMessages: (conversationId: string, messages: Message[]) => void;
  syncConversations: (connectionId: string, sessions: SessionInfo[]) => void;
  deleteConversation: (id: string) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

const STORAGE_KEY = 'ai-chat-conversations';
const CURRENT_ID_KEY = 'ai-chat-current-id';

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const currentId = localStorage.getItem(CURRENT_ID_KEY);
      if (stored) {
        const parsed: Conversation[] = JSON.parse(stored);
        const normalized = parsed.map((conv) => ({
          ...conv,
          sessionId: conv.sessionId || conv.id,
          connectionId: conv.connectionId || 'unknown',
        }));
        setConversations(normalized);
        if (currentId) {
          const found = normalized.find((conv) => conv.id === currentId);
          if (found) {
            setCurrentConversation(found);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Failed to persist conversations:', error);
    }
  }, [conversations]);

  useEffect(() => {
    if (currentConversation) {
      localStorage.setItem(CURRENT_ID_KEY, currentConversation.id);
    }
  }, [currentConversation]);

  const createConversation = useCallback((conversation: Conversation) => {
    setConversations((prev) => {
      const exists = prev.find((conv) => conv.id === conversation.id);
      if (exists) {
        return prev.map((conv) =>
          conv.id === conversation.id ? { ...conv, ...conversation } : conv
        );
      }
      return [conversation, ...prev];
    });
    setCurrentConversation(conversation);
  }, []);

  const addMessage = useCallback(
    (message: Message) => {
      if (!currentConversation) return;
      const kind = message.kind ?? 'message';

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== currentConversation.id) {
            return conv;
          }
          const updatedMessages = [...conv.messages, message];
          const updatedConv = {
            ...conv,
            messages: updatedMessages,
            updatedAt: Date.now(),
            title:
              conv.messages.length === 0 &&
              message.role === 'user' &&
              kind === 'message'
                ? message.content.slice(0, 30) +
                  (message.content.length > 30 ? '...' : '')
                : conv.title,
          };
          setCurrentConversation(updatedConv);
          return updatedConv;
        })
      );
    },
    [currentConversation]
  );

  const updateLastMessage = useCallback(
    (updates: Partial<Message>) => {
      if (!currentConversation) return;

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== currentConversation.id) {
            return conv;
          }
          const messages = [...conv.messages];
          if (messages.length > 0) {
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              ...updates,
            };
          }
          const updatedConv = {
            ...conv,
            messages,
            updatedAt: Date.now(),
          };
          setCurrentConversation(updatedConv);
          return updatedConv;
        })
      );
    },
    [currentConversation]
  );

  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      if (!currentConversation) return;

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== currentConversation.id) {
            return conv;
          }
          const messages = conv.messages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          );
          const updatedConv = {
            ...conv,
            messages,
            updatedAt: Date.now(),
          };
          setCurrentConversation(updatedConv);
          return updatedConv;
        })
      );
    },
    [currentConversation]
  );

  const renameConversation = useCallback(
    (conversationId: string, title: string) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== conversationId) {
            return conv;
          }
          const updated = {
            ...conv,
            title,
            updatedAt: Date.now(),
          };
          if (currentConversation?.id === conversationId) {
            setCurrentConversation(updated);
          }
          return updated;
        })
      );
    },
    [currentConversation]
  );

  const setConversationMessages = useCallback(
    (conversationId: string, messages: Message[]) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== conversationId) {
            return conv;
          }
          const updatedConv = {
            ...conv,
            messages,
            updatedAt: Date.now(),
          };
          if (currentConversation?.id === conversationId) {
            setCurrentConversation(updatedConv);
          }
          return updatedConv;
        })
      );
    },
    [currentConversation]
  );

  const syncConversations = useCallback(
    (connectionId: string, sessions: SessionInfo[]) => {
      setConversations((prev) => {
        const existingMap = new Map(
          prev
            .filter((conv) => conv.connectionId === connectionId)
            .map((conv) => [conv.id, conv])
        );

        const nextForConnection = sessions.map((session) => {
          const existing = existingMap.get(session.id);
          const createdAt = Date.parse(session.created_at) || Date.now();
          const updatedAt = Date.parse(session.last_active_at) || Date.now();
          if (existing) {
            return {
              ...existing,
              title: session.title || existing.title,
              cwd: session.cwd,
              createdAt,
              updatedAt,
            };
          }
          return {
            id: session.id,
            title: session.title || 'New chat',
            messages: [],
            createdAt,
            updatedAt,
            sessionId: session.id,
            connectionId,
            cwd: session.cwd,
          };
        });

        const others = prev.filter((conv) => conv.connectionId !== connectionId);
        return [...nextForConnection, ...others];
      });
    },
    []
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
      }
    },
    [currentConversation]
  );

  const value = useMemo(
    () => ({
      conversations,
      currentConversation,
      setCurrentConversation,
      createConversation,
      addMessage,
      updateLastMessage,
      updateMessage,
      renameConversation,
      setConversationMessages,
      syncConversations,
      deleteConversation,
    }),
    [
      conversations,
      currentConversation,
      createConversation,
      addMessage,
      updateLastMessage,
      updateMessage,
      renameConversation,
      setConversationMessages,
      syncConversations,
      deleteConversation,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/common/Header';
import { ChatSidebar } from './ChatSidebar';
import { ChatContent } from './ChatContent';
import { ChatInput } from './ChatInput';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { NewSessionDialog } from '@/components/chat/NewSessionDialog';
import { useChat } from '@/contexts/ChatContext';
import { useConnections } from '@/hooks/useConnections';
import { usePreferences } from '@/hooks/usePreferences';
import { createBackendClient } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Conversation, Message, SessionCreateOptions } from '@/types/chat';

export function ChatLayout() {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });

  const {
    connections,
    activeConnection,
    activeConnectionId,
    addConnection,
    updateConnection,
    removeConnection,
    setActiveConnection,
    isConfigured,
  } = useConnections();

  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    createConversation,
    addMessage,
    updateMessage,
    renameConversation,
    setConversationMessages,
    syncConversations,
    deleteConversation,
  } = useChat();

  const { processDisplayMode } = usePreferences();
  const { t } = useTranslation();
  const cancelFnRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const thinkingContentRef = useRef<string>('');
  const thinkingMessageIdRef = useRef<string | null>(null);
  const stopRequestedRef = useRef(false);

  const connectionConversations = useMemo(() => {
    if (!activeConnection) return [];
    return conversations.filter(
      (conv) => conv.connectionId === activeConnection.id
    );
  }, [conversations, activeConnection]);

  useEffect(() => {
    if (!activeConnection || !activeConnection.verified) {
      setSettingsOpen(true);
      return;
    }
    const api = createBackendClient(activeConnection);
    api
      .listSessions()
      .then((sessions) => {
        syncConversations(activeConnection.id, sessions);
      })
      .catch((error) => {
        toast.error(t('errors.failedLoadSessions', { message: error.message }));
      });
  }, [activeConnection, syncConversations, t]);

  useEffect(() => {
    if (!activeConnection) {
      setCurrentConversation(null);
      return;
    }
    if (
      currentConversation?.connectionId === activeConnection.id &&
      connectionConversations.some((conv) => conv.id === currentConversation.id)
    ) {
      return;
    }
    setCurrentConversation(connectionConversations[0] || null);
  }, [
    activeConnection,
    connectionConversations,
    currentConversation,
    setCurrentConversation,
  ]);

  const handleSelectConversation = useCallback(
    async (conversation: Conversation) => {
      setCurrentConversation(conversation);
      if (!activeConnection || conversation.messages.length > 0) {
        return;
      }
      try {
        const api = createBackendClient(activeConnection);
        const messages = await api.listMessages(conversation.sessionId);
        const mapped = messages.map((msg, index) => ({
          id: `${conversation.id}-${index}`,
          role: msg.role,
          content: msg.content,
          kind: msg.kind ?? 'message',
          metadata: msg.metadata ?? null,
          timestamp: Date.parse(msg.created_at) || Date.now(),
        }));
        setConversationMessages(conversation.id, mapped);
      } catch (error) {
        toast.error(t('errors.failedLoadHistory'));
      }
    },
    [activeConnection, setConversationMessages, setCurrentConversation, t]
  );

  const handleCreateSession = useCallback(
    async (payload: SessionCreateOptions) => {
      if (!activeConnection) {
        toast.error(t('errors.configureBackendFirst'));
        setSettingsOpen(true);
        return;
      }
      setIsCreatingSession(true);
      try {
        const api = createBackendClient(activeConnection);
        const sessionId = await api.createSession(payload);
        const now = Date.now();
        createConversation({
          id: sessionId,
          title: t('chat.newChat'),
          messages: [],
          createdAt: now,
          updatedAt: now,
          sessionId,
          connectionId: activeConnection.id,
          cwd: payload.cwd,
        });
        setNewSessionOpen(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('errors.createFailed');
        toast.error(message);
      } finally {
        setIsCreatingSession(false);
      }
    },
    [activeConnection, createConversation, t]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!isConfigured || !activeConnection) {
        toast.error(t('errors.configureBackendVerified'));
        setSettingsOpen(true);
        return;
      }

      if (!currentConversation) {
        toast.error(t('errors.createSessionFirst'));
        setNewSessionOpen(true);
        return;
      }

      const now = Date.now();
      stopRequestedRef.current = false;
      const userMessage: Message = {
        id: `msg-${now}-user`,
        role: 'user',
        content,
        kind: 'message',
        timestamp: now,
      };
      addMessage(userMessage);

      const thinkingId = `msg-${now}-thinking`;
      thinkingMessageIdRef.current = thinkingId;
      const thinkingMessage: Message = {
        id: thinkingId,
        role: 'assistant',
        content: '',
        kind: 'thinking',
        timestamp: now,
        isStreaming: true,
      };
      addMessage(thinkingMessage);

      thinkingContentRef.current = '';
      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        const api = createBackendClient(activeConnection);
        const outgoing = [...currentConversation.messages, userMessage];
        let eventIndex = 0;
        const nextEventId = (prefix: string) =>
          `msg-${now}-${prefix}-${eventIndex++}`;
        const cancelFn = await api.streamChat(
          currentConversation.sessionId,
          outgoing,
          {
            onDelta: (delta) => {
              thinkingContentRef.current += delta;
              if (!thinkingMessageIdRef.current) {
                return;
              }
              updateMessage(thinkingMessageIdRef.current, {
                content: thinkingContentRef.current,
                isStreaming: true,
              });
            },
            onDone: () => {
              if (thinkingMessageIdRef.current) {
                updateMessage(thinkingMessageIdRef.current, {
                  isStreaming: false,
                });
              }
              thinkingMessageIdRef.current = null;
              setIsLoading(false);
              stopRequestedRef.current = false;
            },
            onStatus: (payload) => {
              addMessage({
                id: nextEventId('status'),
                role: 'assistant',
                content: '',
                kind: 'status',
                metadata: payload,
                timestamp: Date.now(),
              });
            },
            onToolUse: (payload) => {
              addMessage({
                id: nextEventId('tool-use'),
                role: 'assistant',
                content: '',
                kind: 'tool_use',
                metadata: payload,
                timestamp: Date.now(),
              });
            },
            onToolResult: (payload) => {
              addMessage({
                id: nextEventId('tool-result'),
                role: 'assistant',
                content: '',
                kind: 'tool_result',
                metadata: payload,
                timestamp: Date.now(),
              });
            },
            onResult: (payload) => {
              addMessage({
                id: nextEventId('result'),
                role: 'assistant',
                content: payload.content ?? '',
                kind: 'result',
                timestamp: Date.now(),
              });
            },
            onError: (err) => {
              if (stopRequestedRef.current) {
                stopRequestedRef.current = false;
                setIsLoading(false);
                if (thinkingMessageIdRef.current) {
                  updateMessage(thinkingMessageIdRef.current, {
                    isStreaming: false,
                  });
                }
                thinkingMessageIdRef.current = null;
                return;
              }
              toast.error(err.message);
              if (thinkingMessageIdRef.current) {
                updateMessage(thinkingMessageIdRef.current, {
                  isStreaming: false,
                });
              }
              thinkingMessageIdRef.current = null;
              setIsLoading(false);
            },
          },
          abortControllerRef.current.signal
        );
        cancelFnRef.current = cancelFn;
      } catch (error) {
        setIsLoading(false);
        const message = error instanceof Error ? error.message : t('errors.sendFailed');
        toast.error(message);
      }
    },
    [
      activeConnection,
      addMessage,
      currentConversation,
      isConfigured,
      updateMessage,
      t,
    ]
  );

  const handleStop = useCallback(async () => {
    if (!activeConnection || !currentConversation) {
      return;
    }
    stopRequestedRef.current = true;
    addMessage({
      id: `msg-${Date.now()}-status-stop`,
      role: 'assistant',
      content: '',
      kind: 'status',
      metadata: { state: 'cancelled' },
      timestamp: Date.now(),
    });
    try {
      const api = createBackendClient(activeConnection);
      await api.interrupt(currentConversation.sessionId);
    } catch (error) {
      console.error('Interrupt failed:', error);
    }
    cancelFnRef.current?.();
    abortControllerRef.current?.abort();
    if (thinkingMessageIdRef.current) {
      updateMessage(thinkingMessageIdRef.current, { isStreaming: false });
    }
    thinkingMessageIdRef.current = null;
    setIsLoading(false);
  }, [activeConnection, addMessage, currentConversation, updateMessage]);

  const handleRenameConversation = useCallback(
    async (conversationId: string, title: string) => {
      if (!activeConnection) return;
      try {
        const api = createBackendClient(activeConnection);
        const updatedTitle = await api.updateSessionTitle(
          conversationId,
          title
        );
        renameConversation(conversationId, updatedTitle);
      } catch (error) {
        toast.error(t('errors.updateTitleFailed'));
      }
    },
    [activeConnection, renameConversation, t]
  );

  useEffect(() => {
    return () => {
      cancelFnRef.current?.();
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Header
        onSettingsClick={() => setSettingsOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        onAdminClick={() => navigate('/admin')}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-14 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {sidebarOpen && (
          <ChatSidebar
            conversations={connectionConversations}
            currentConversation={currentConversation}
            onSelectConversation={handleSelectConversation}
            onNewConversation={() => {
              if (!isConfigured) {
                toast.error(t('errors.configureBackendVerified'));
                setSettingsOpen(true);
                return;
              }
              setNewSessionOpen(true);
            }}
            onDeleteConversation={deleteConversation}
            onRenameConversation={handleRenameConversation}
            connectionLabel={
              activeConnection
                ? `${activeConnection.name} @ ${activeConnection.baseUrl}`
                : undefined
            }
          />
        )}
        <div className="flex flex-1 flex-col min-w-0">
          <ChatContent
            messages={currentConversation?.messages || []}
            processDisplayMode={processDisplayMode}
          />
          <ChatInput
            onSend={handleSendMessage}
            onStop={handleStop}
            disabled={isLoading || !isConfigured || !currentConversation}
            isStreaming={isLoading}
          />
        </div>
      </div>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        connections={connections}
        activeConnectionId={activeConnectionId}
        onAddConnection={addConnection}
        onUpdateConnection={updateConnection}
        onRemoveConnection={removeConnection}
        onSetActiveConnection={setActiveConnection}
      />
      <NewSessionDialog
        open={newSessionOpen}
        onOpenChange={setNewSessionOpen}
        onCreate={handleCreateSession}
        isSubmitting={isCreatingSession}
      />
    </div>
  );
}

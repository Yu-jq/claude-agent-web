import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ApiConnection } from '@/types/chat';

const CONNECTIONS_KEY = 'ai-chat-connections';
const ACTIVE_CONNECTION_KEY = 'ai-chat-active-connection';

function loadConnections(): ApiConnection[] {
  try {
    const stored = localStorage.getItem(CONNECTIONS_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load connections:', error);
  }
  return [];
}

function loadActiveConnectionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CONNECTION_KEY);
  } catch (error) {
    console.error('Failed to load active connection:', error);
    return null;
  }
}

export function useConnections() {
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

  useEffect(() => {
    setConnections(loadConnections());
    setActiveConnectionId(loadActiveConnectionId());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
    } catch (error) {
      console.error('Failed to persist connections:', error);
    }
  }, [connections]);

  useEffect(() => {
    try {
      if (!activeConnectionId) {
        localStorage.removeItem(ACTIVE_CONNECTION_KEY);
        return;
      }
      localStorage.setItem(ACTIVE_CONNECTION_KEY, activeConnectionId);
    } catch (error) {
      console.error('Failed to persist active connection:', error);
    }
  }, [activeConnectionId]);

  const activeConnection = useMemo(() => {
    if (!activeConnectionId) {
      return null;
    }
    return connections.find((conn) => conn.id === activeConnectionId) || null;
  }, [connections, activeConnectionId]);

  const addConnection = useCallback((connection: ApiConnection) => {
    setConnections((prev) => [connection, ...prev]);
  }, []);

  const updateConnection = useCallback(
    (id: string, updates: Partial<ApiConnection>) => {
      setConnections((prev) =>
        prev.map((conn) => (conn.id === id ? { ...conn, ...updates } : conn))
      );
    },
    []
  );

  const removeConnection = useCallback((id: string) => {
    setConnections((prev) => prev.filter((conn) => conn.id !== id));
    setActiveConnectionId((prev) => (prev === id ? null : prev));
  }, []);

  const setActiveConnection = useCallback((id: string | null) => {
    setActiveConnectionId(id);
  }, []);

  return {
    connections,
    activeConnection,
    activeConnectionId,
    addConnection,
    updateConnection,
    removeConnection,
    setActiveConnection,
    isConfigured: Boolean(activeConnection?.verified),
  };
}

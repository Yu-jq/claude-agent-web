import type {
  AdminSessionInfo,
  ApiConnection,
  ApiKeyCreateResponse,
  ApiKeyInfo,
  Message,
  MessageInfo,
  SessionCreateOptions,
  SessionInfo,
  StreamHandlers,
} from '@/types/chat';

export class BackendClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private authHeaders(sessionId?: string): HeadersInit {
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }
    return headers;
  }

  private adminHeaders(adminKey: string): HeadersInit {
    return {
      'X-Admin-Key': adminKey,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions`, {
        method: 'GET',
        headers: this.authHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async createSession(payload: SessionCreateOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
    const data = await response.json();
    return data.session_id as string;
  }

  async listSessions(): Promise<SessionInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'GET',
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
    const data = await response.json();
    return data.sessions as SessionInfo[];
  }

  async listMessages(sessionId: string): Promise<MessageInfo[]> {
    const response = await fetch(
      `${this.baseUrl}/api/sessions/${sessionId}/messages`,
      {
        method: 'GET',
        headers: this.authHeaders(),
      }
    );
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
    const data = await response.json();
    return data.messages as MessageInfo[];
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(),
      },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
    const data = await response.json();
    return data.title as string;
  }

  async adminListSessions(adminKey: string): Promise<AdminSessionInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/admin/sessions`, {
      method: 'GET',
      headers: this.adminHeaders(adminKey),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
    const data = await response.json();
    return data.sessions as AdminSessionInfo[];
  }

  async adminListMessages(
    adminKey: string,
    sessionId: string
  ): Promise<MessageInfo[]> {
    const response = await fetch(
      `${this.baseUrl}/api/admin/sessions/${sessionId}/messages`,
      {
        method: 'GET',
        headers: this.adminHeaders(adminKey),
      }
    );
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
    const data = await response.json();
    return data.messages as MessageInfo[];
  }

  async adminListApiKeys(adminKey: string): Promise<ApiKeyInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/admin/apikeys`, {
      method: 'GET',
      headers: this.adminHeaders(adminKey),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
    const data = await response.json();
    return data.api_keys as ApiKeyInfo[];
  }

  async adminCreateApiKey(
    adminKey: string,
    expiresAt?: string
  ): Promise<ApiKeyCreateResponse> {
    const headers: Record<string, string> = {
      ...(this.adminHeaders(adminKey) as Record<string, string>),
    };
    let body: string | undefined;
    if (expiresAt) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ expires_at: expiresAt });
    }
    const response = await fetch(`${this.baseUrl}/api/admin/apikeys`, {
      method: 'POST',
      headers,
      body,
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
    return (await response.json()) as ApiKeyCreateResponse;
  }

  async adminRevokeApiKey(adminKey: string, apiKeyId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/admin/apikeys/${apiKeyId}/revoke`,
      {
        method: 'POST',
        headers: this.adminHeaders(adminKey),
      }
    );
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
  }

  async interrupt(sessionId: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/interrupt`, {
      method: 'POST',
      headers: this.authHeaders(sessionId),
    });
  }

  async streamChat(
    sessionId: string,
    messages: Message[],
    handlers: StreamHandlers,
    signal?: AbortSignal
  ): Promise<() => void> {
    const payload = {
      model: 'claude',
      stream: true,
      messages: messages
        .filter((msg) => (msg.kind ?? 'message') === 'message')
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
    };

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(sessionId),
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`HTTP ${response.status}: ${message}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let closed = false;

    const handleEventBlock = (block: string) => {
      const lines = block.split('\n');
      let eventName = 'message';
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
          continue;
        }
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }

      if (dataLines.length === 0) {
        return;
      }

      const data = dataLines.join('\n');
      if (eventName === 'message') {
        if (data === '[DONE]') {
          handlers.onDone?.();
          closed = true;
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed?.error?.message) {
            handlers.onError?.({
              code: 'server_error',
              message: parsed.error.message,
            });
            closed = true;
            return;
          }
          const choice = parsed?.choices?.[0];
          const delta = choice?.delta;
          if (delta?.role) {
            handlers.onRole?.(delta.role);
          }
          if (delta?.content) {
            handlers.onDelta?.(delta.content);
          }
        } catch (error) {
          handlers.onError?.({
            code: 'stream_error',
            message: 'Failed to parse stream data.',
          });
        }
        return;
      }

      try {
        const parsed = JSON.parse(data);
        if (eventName === 'status') {
          handlers.onStatus?.(parsed);
        } else if (eventName === 'tool_use') {
          handlers.onToolUse?.(parsed);
        } else if (eventName === 'tool_result') {
          handlers.onToolResult?.(parsed);
        } else if (eventName === 'result') {
          handlers.onResult?.(parsed);
        }
      } catch (error) {
        handlers.onError?.({
          code: 'stream_error',
          message: 'Failed to parse event data.',
        });
      }
    };

    const processStream = async () => {
      try {
        while (!closed) {
          const { done, value } = await reader.read();
          if (done) {
            if (!closed) {
              handlers.onDone?.();
              closed = true;
            }
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';
          for (const block of blocks) {
            if (block.trim().length === 0) {
              continue;
            }
            handleEventBlock(block);
            if (closed) {
              break;
            }
          }
        }
      } catch (error) {
        if (!closed && error instanceof Error && error.name !== 'AbortError') {
          handlers.onError?.({
            code: 'stream_error',
            message: error.message,
          });
        }
      }
    };

    processStream();

    return () => {
      closed = true;
      reader.cancel().catch(() => {});
    };
  }
}

export function createBackendClient(connection: ApiConnection): BackendClient {
  return new BackendClient(connection.baseUrl, connection.apiKey);
}

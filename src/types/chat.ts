export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageKind =
  | 'message'
  | 'status'
  | 'tool_use'
  | 'tool_result'
  | 'thinking'
  | 'result';
export type ProcessDisplayMode = 'full' | 'status';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  kind?: MessageKind;
  metadata?: Record<string, unknown> | null;
  timestamp: number;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  sessionId: string;
  connectionId: string;
  cwd?: string;
}

export interface ApiConnection {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  verified: boolean;
  lastCheckedAt?: number;
  processDisplayMode?: ProcessDisplayMode;
}

export interface SessionCreateOptions {
  // Session options are server-managed; payload is intentionally empty.
}

export interface SessionInfo {
  id: string;
  title?: string;
  cwd: string;
  created_at: string;
  last_active_at: string;
}

export interface AdminSessionInfo extends SessionInfo {
  api_key_id: string;
  claude_session_id?: string | null;
}

export interface MessageInfo {
  role: MessageRole;
  content: string;
  kind?: MessageKind;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface SessionListResponse {
  sessions: SessionInfo[];
}

export interface MessageListResponse {
  messages: MessageInfo[];
}

export interface ApiKeyInfo {
  id: string;
  api_key: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
  policy?: ApiKeyPolicy | null;
}

export interface ApiKeyCreateResponse {
  id: string;
  api_key: string;
  created_at: string;
  expires_at: string;
  policy?: ApiKeyPolicy | null;
}

export interface ApiKeyPolicy {
  allowed_tools?: string[];
  permission_mode?: string;
  setting_sources?: string[];
  process_display_mode?: ProcessDisplayMode;
  sandbox?: Record<string, unknown> | null;
}

export interface PolicyResponse {
  policy: ApiKeyPolicy;
}

export interface StreamHandlers {
  onRole?: (role: MessageRole) => void;
  onDelta?: (delta: string) => void;
  onDone?: () => void;
  onStatus?: (payload: { state: string; message?: string }) => void;
  onToolUse?: (payload: {
    tool: string;
    input: unknown;
    tool_use_id?: string;
  }) => void;
  onToolResult?: (payload: { tool_use_id?: string; output: unknown }) => void;
  onResult?: (payload: { content: string }) => void;
  onError?: (error: { code: string; message: string }) => void;
}

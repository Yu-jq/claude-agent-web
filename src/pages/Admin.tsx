import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, RefreshCcw, Shield, KeyRound, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { createBackendClient } from '@/lib/api';
import { useConnections } from '@/hooks/useConnections';
import { usePreferences } from '@/hooks/usePreferences';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type {
  AdminSessionInfo,
  ApiKeyInfo,
  MessageInfo,
} from '@/types/chat';
import { useTranslation } from 'react-i18next';

const ADMIN_KEY_STORAGE = 'ai-chat-admin-keys';

function loadAdminKey(connectionId: string): string | null {
  try {
    const stored = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored) as Record<string, string>;
    return parsed[connectionId] || null;
  } catch (error) {
    console.error('Failed to load admin key:', error);
    return null;
  }
}

function saveAdminKey(connectionId: string, key: string) {
  try {
    const stored = localStorage.getItem(ADMIN_KEY_STORAGE);
    const parsed = stored ? (JSON.parse(stored) as Record<string, string>) : {};
    parsed[connectionId] = key;
    localStorage.setItem(ADMIN_KEY_STORAGE, JSON.stringify(parsed));
  } catch (error) {
    console.error('Failed to save admin key:', error);
  }
}

function removeAdminKey(connectionId: string) {
  try {
    const stored = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (!stored) {
      return;
    }
    const parsed = JSON.parse(stored) as Record<string, string>;
    delete parsed[connectionId];
    localStorage.setItem(ADMIN_KEY_STORAGE, JSON.stringify(parsed));
  } catch (error) {
    console.error('Failed to remove admin key:', error);
  }
}

function formatStatus(
  metadata: Record<string, unknown> | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const rawState = metadata?.state;
  const state = typeof rawState === 'string' ? rawState : undefined;
  if (state === 'thinking_start') return t('chat.thinkingStatus');
  if (state === 'thinking_end') return t('chat.doneStatus');
  if (state === 'cancelled') return t('chat.cancelledStatus');
  if (state === 'error') {
    const detail = metadata?.message;
    return typeof detail === 'string'
      ? `${t('chat.errorStatus')} ${detail}`
      : t('chat.errorStatus');
  }
  return t('chat.workingStatus');
}

function formatToolValue(value: unknown) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

export default function Admin() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeConnection, isConfigured } = useConnections();
  const { processDisplayMode } = usePreferences();
  const [adminKey, setAdminKey] = useState('');
  const [remember, setRemember] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [sessions, setSessions] = useState<AdminSessionInfo[]>([]);
  const [sessionFilter, setSessionFilter] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<MessageInfo[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [apiKeyVisible, setApiKeyVisible] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('sessions');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [expiryMode, setExpiryMode] = useState<'duration' | 'datetime'>(
    'duration'
  );
  const [expiryValue, setExpiryValue] = useState('30');
  const [expiryUnit, setExpiryUnit] = useState<
    'minutes' | 'hours' | 'days' | 'months'
  >('minutes');
  const [expiryDateTime, setExpiryDateTime] = useState('');

  const client = useMemo(() => {
    if (!activeConnection) {
      return null;
    }
    return createBackendClient(activeConnection);
  }, [activeConnection]);

  const expiresAt = useMemo(() => {
    if (expiryMode === 'datetime') {
      if (!expiryDateTime.trim()) {
        return null;
      }
      const parsed = new Date(expiryDateTime);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return parsed.toISOString();
    }

    const value = Number(expiryValue);
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    const unitMs =
      expiryUnit === 'minutes'
        ? 60 * 1000
        : expiryUnit === 'hours'
          ? 60 * 60 * 1000
          : expiryUnit === 'days'
            ? 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + value * unitMs).toISOString();
  }, [expiryDateTime, expiryMode, expiryUnit, expiryValue]);

  const expiresPreview = useMemo(() => {
    if (!expiresAt) {
      return '';
    }
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toLocaleString();
  }, [expiresAt]);

  const isExpiryValid = useMemo(() => {
    if (!expiresAt) {
      return false;
    }
    return new Date(expiresAt).getTime() > Date.now();
  }, [expiresAt]);

  const filteredSessions = useMemo(() => {
    const term = sessionFilter.trim().toLowerCase();
    if (!term) {
      return sessions;
    }
    return sessions.filter((session) => {
      return (
        session.title?.toLowerCase().includes(term) ||
        session.id.toLowerCase().includes(term) ||
        session.cwd.toLowerCase().includes(term) ||
        session.api_key_id.toLowerCase().includes(term)
      );
    });
  }, [sessions, sessionFilter]);

  const attemptLogin = useCallback(
    async (key: string, silent = false) => {
      if (!client) {
        if (!silent) {
          toast.error(t('errors.connectionMissing'));
        }
        return;
      }
      if (!key.trim()) {
        if (!silent) {
          toast.error(t('errors.adminKeyRequired'));
        }
        return;
      }
      setIsAuthLoading(true);
      try {
        const sessionsData = await client.adminListSessions(key.trim());
        setSessions(sessionsData);
        setIsAuthenticated(true);
        if (remember) {
          saveAdminKey(activeConnection!.id, key.trim());
        } else {
          removeAdminKey(activeConnection!.id);
        }
      } catch (error) {
        setIsAuthenticated(false);
        if (!silent) {
          toast.error(t('errors.adminAuthFailed'));
        }
      } finally {
        setIsAuthLoading(false);
      }
    },
    [client, remember, activeConnection, t]
  );

  useEffect(() => {
    if (!activeConnection) {
      setIsAuthenticated(false);
      return;
    }
    const saved = loadAdminKey(activeConnection.id);
    if (saved) {
      setAdminKey(saved);
      setRemember(true);
      attemptLogin(saved, true);
    } else {
      setIsAuthenticated(false);
    }
  }, [activeConnection, attemptLogin]);

  const fetchSessions = useCallback(async () => {
    if (!client) return;
    setLoadingSessions(true);
    try {
      const data = await client.adminListSessions(adminKey.trim());
      setSessions(data);
    } catch (error) {
      toast.error(t('errors.refreshSessionsFailed'));
    } finally {
      setLoadingSessions(false);
    }
  }, [client, adminKey, t]);

  const fetchMessages = useCallback(
    async (sessionId: string) => {
      if (!client) return;
      setLoadingMessages(true);
      try {
        const data = await client.adminListMessages(adminKey.trim(), sessionId);
        setSessionMessages(data);
      } catch (error) {
        toast.error(t('errors.loadMessagesFailed'));
      } finally {
        setLoadingMessages(false);
      }
    },
    [client, adminKey, t]
  );

  const fetchApiKeys = useCallback(async () => {
    if (!client) return;
    setLoadingKeys(true);
    try {
      const data = await client.adminListApiKeys(adminKey.trim());
      setApiKeys(data);
    } catch (error) {
      toast.error(t('errors.loadApiKeysFailed'));
    } finally {
      setLoadingKeys(false);
    }
  }, [client, adminKey, t]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated, fetchSessions]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'keys') {
      fetchApiKeys();
    }
  }, [activeTab, isAuthenticated, fetchApiKeys]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionMessages([]);
      return;
    }
    fetchMessages(selectedSessionId);
  }, [selectedSessionId, fetchMessages]);

  const handleCreateKey = async () => {
    if (!client) return;
    if (!isExpiryValid || !expiresAt) {
      toast.error(t('errors.expiryInvalid'));
      return;
    }
    try {
      const created = await client.adminCreateApiKey(adminKey.trim(), expiresAt);
      toast.success(t('success.newApiKey', { key: created.api_key }));
      fetchApiKeys();
    } catch (error) {
      toast.error(t('errors.createApiKeyFailed'));
    }
  };

  const handleRevokeKey = async (apiKeyId: string) => {
    if (!client) return;
    try {
      await client.adminRevokeApiKey(adminKey.trim(), apiKeyId);
      fetchApiKeys();
    } catch (error) {
      toast.error(t('errors.revokeApiKeyFailed'));
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setApiKeyVisible((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  if (!activeConnection || !isConfigured) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-6 px-6 py-20 text-center">
          <Shield className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">{t('admin.title')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('admin.requiresConnection')}
            </p>
          </div>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('admin.backToChat')}
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-20">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">{t('admin.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('admin.connectedTo', { name: activeConnection.name })}
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="adminKey">
                  {t('admin.adminKey')}
                </label>
                <Input
                  id="adminKey"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="X-Admin-Key"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('admin.rememberKey')}
                </span>
                <Switch checked={remember} onCheckedChange={setRemember} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => attemptLogin(adminKey)}
                  disabled={isAuthLoading}
                >
                  {isAuthLoading ? t('admin.verifying') : t('admin.signIn')}
                </Button>
                <Button variant="ghost" onClick={() => navigate('/')}>
                  {t('admin.backToChat')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">{t('admin.title')}</h1>
            <p className="text-xs text-muted-foreground">
              {t('admin.connectedToUrl', {
                name: activeConnection.name,
                url: activeConnection.baseUrl,
              })}
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('admin.backToChat')}
          </Button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sessions">{t('admin.sessions')}</TabsTrigger>
            <TabsTrigger value="keys">{t('admin.apiKeys')}</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t('admin.searchSessions')}
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                  className="w-64"
                />
              </div>
              <Button
                variant="outline"
                onClick={fetchSessions}
                disabled={loadingSessions}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t('admin.refresh')}
              </Button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.titleLabel')}</TableHead>
                      <TableHead>{t('admin.cwdLabel')}</TableHead>
                      <TableHead>{t('admin.apiKeyLabel')}</TableHead>
                      <TableHead>{t('admin.updatedLabel')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm">
                          {t('admin.noSessions')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSessions.map((session) => (
                        <TableRow
                          key={session.id}
                          className={cn(
                            'cursor-pointer',
                            selectedSessionId === session.id && 'bg-accent'
                          )}
                          onClick={() => setSelectedSessionId(session.id)}
                        >
                          <TableCell className="font-medium">
                            {session.title || t('admin.untitled')}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {session.cwd}
                          </TableCell>
                          <TableCell>{session.api_key_id}</TableCell>
                          <TableCell>{session.last_active_at}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold">
                  {t('admin.sessionMessages')}
                </h3>
                {selectedSessionId ? (
                  <div className="mt-3 space-y-3">
                    {loadingMessages && (
                      <div className="text-xs text-muted-foreground">
                        {t('admin.loadingMessages')}
                      </div>
                    )}
                    {sessionMessages.length === 0 && !loadingMessages && (
                      <div className="text-xs text-muted-foreground">
                        {t('admin.noMessages')}
                      </div>
                    )}
                    {sessionMessages.map((msg, index) => (
                      <div
                        key={`${msg.role}-${index}`}
                        className="rounded-md border border-border/60 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="uppercase">
                            {msg.role} {msg.kind ? `(${msg.kind})` : ''}
                          </span>
                          <span>{msg.created_at}</span>
                        </div>
                        {msg.kind === 'status' ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {formatStatus(msg.metadata ?? null, t)}
                          </p>
                        ) : msg.kind === 'tool_use' ? (
                          <div className="mt-2 text-sm text-foreground/90">
                            <div className="font-medium">
                              {t('chat.toolUse', {
                                tool:
                                  typeof msg.metadata?.tool === 'string'
                                    ? msg.metadata.tool
                                    : 'unknown',
                              })}
                            </div>
                            {processDisplayMode === 'full' ? (
                              <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                                {formatToolValue(msg.metadata?.input)}
                              </pre>
                            ) : (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {t('chat.toolRunning')}
                              </div>
                            )}
                          </div>
                        ) : msg.kind === 'tool_result' ? (
                          <div className="mt-2 text-sm text-foreground/90">
                            <div className="font-medium">
                              {t('chat.toolResult', {
                                id:
                                  typeof msg.metadata?.tool_use_id === 'string'
                                    ? msg.metadata.tool_use_id
                                    : 'unknown',
                              })}
                            </div>
                            {processDisplayMode === 'full' ? (
                              <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                                {formatToolValue(msg.metadata?.output)}
                              </pre>
                            ) : (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {t('chat.toolFinished')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                            {msg.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t('admin.selectSession')}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="keys" className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <KeyRound className="h-4 w-4" />
                {t('admin.manageKeys')}
              </div>
              <Button
                variant="outline"
                onClick={fetchApiKeys}
                disabled={loadingKeys}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t('admin.refresh')}
              </Button>
            </div>

            <div className="mt-4 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('admin.expiryMode')}
                  </span>
                  <Select
                    value={expiryMode}
                    onValueChange={(value) =>
                      setExpiryMode(value as 'duration' | 'datetime')
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t('admin.duration')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="duration">
                        {t('admin.duration')}
                      </SelectItem>
                      <SelectItem value="datetime">
                        {t('admin.dateTime')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {expiryMode === 'duration' ? (
                  <div className="grid gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('admin.duration')}
                    </span>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={expiryValue}
                        onChange={(e) => setExpiryValue(e.target.value)}
                        className="w-24"
                      />
                      <Select
                        value={expiryUnit}
                        onValueChange={(value) =>
                          setExpiryUnit(
                            value as 'minutes' | 'hours' | 'days' | 'months'
                          )
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder={t('admin.unitLabel')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">
                            {t('admin.minutes')}
                          </SelectItem>
                          <SelectItem value="hours">{t('admin.hours')}</SelectItem>
                          <SelectItem value="days">{t('admin.days')}</SelectItem>
                          <SelectItem value="months">
                            {t('admin.months')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('admin.expiresAt')}
                    </span>
                    <Input
                      type="datetime-local"
                      value={expiryDateTime}
                      onChange={(e) => setExpiryDateTime(e.target.value)}
                      className="w-64"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>{t('admin.expiresAt')}</span>
                  <span className="font-mono text-[11px]">
                    {expiresPreview || t('admin.invalidTime')}
                  </span>
                </div>

                <Button onClick={handleCreateKey} disabled={!isExpiryValid}>
                  {t('admin.createKey')}
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.idLabel')}</TableHead>
                    <TableHead>{t('admin.apiKeyLabel')}</TableHead>
                    <TableHead>{t('admin.expiresLabel')}</TableHead>
                    <TableHead>{t('admin.statusLabel')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm">
                        {t('admin.noApiKeys')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    apiKeys.map((key) => {
                      const visible = apiKeyVisible[key.id];
                      const masked =
                        key.api_key.length > 6
                          ? `${key.api_key.slice(0, 6)}...`
                          : key.api_key;
                      return (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.id}</TableCell>
                          <TableCell className="flex items-center gap-2">
                            <span className="font-mono text-xs">
                              {visible ? key.api_key : masked}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleKeyVisibility(key.id)}
                            >
                              {visible ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>{key.expires_at}</TableCell>
                          <TableCell>
                            <Badge variant={key.revoked ? 'destructive' : 'secondary'}>
                              {key.revoked
                                ? t('admin.statusRevoked')
                                : t('admin.statusActive')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevokeKey(key.id)}
                              disabled={key.revoked}
                            >
                              {t('admin.revoke')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

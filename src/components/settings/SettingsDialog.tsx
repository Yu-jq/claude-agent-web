import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createBackendClient } from '@/lib/api';
import { usePreferences } from '@/hooks/usePreferences';
import type { ApiConnection, ProcessDisplayMode } from '@/types/chat';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from '@/i18n';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connections: ApiConnection[];
  activeConnectionId: string | null;
  onAddConnection: (connection: ApiConnection) => void;
  onUpdateConnection: (id: string, updates: Partial<ApiConnection>) => void;
  onRemoveConnection: (id: string) => void;
  onSetActiveConnection: (id: string | null) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  connections,
  activeConnectionId,
  onAddConnection,
  onUpdateConnection,
  onRemoveConnection,
  onSetActiveConnection,
}: SettingsDialogProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = usePreferences();
  const [formState, setFormState] = useState({
    id: '',
    name: '',
    baseUrl: '',
    apiKey: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setFormState({ id: '', name: '', baseUrl: '', apiKey: '' });
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formState.name || !formState.baseUrl || !formState.apiKey) {
      toast.error(t('settings.missingFields'));
      return;
    }
    const existing = editingId
      ? connections.find((conn) => conn.id === editingId)
      : null;
    const baseUrl = formState.baseUrl.trim();
    const apiKey = formState.apiKey.trim();
    const verified =
      editingId && existing
        ? existing.verified &&
          existing.baseUrl === baseUrl &&
          existing.apiKey === apiKey
        : false;
    const connection: ApiConnection = {
      id: editingId || uuidv4(),
      name: formState.name.trim(),
      baseUrl,
      apiKey,
      verified,
    };
    if (editingId) {
      onUpdateConnection(editingId, connection);
    } else {
      onAddConnection(connection);
    }
    resetForm();
  };

  const handleEdit = (connection: ApiConnection) => {
    setEditingId(connection.id);
    setFormState({
      id: connection.id,
      name: connection.name,
      baseUrl: connection.baseUrl,
      apiKey: connection.apiKey,
    });
  };

  const handleVerify = async (connection: ApiConnection) => {
    setIsSaving(true);
    try {
      const client = createBackendClient(connection);
      const ok = await client.testConnection();
      let processDisplayMode: ProcessDisplayMode = 'status';
      if (ok) {
        try {
          const policyResponse = await client.getPolicy();
          processDisplayMode =
            policyResponse.policy.process_display_mode === 'full'
              ? 'full'
              : 'status';
        } catch (error) {
          console.error('Failed to load policy:', error);
        }
      }
      onUpdateConnection(connection.id, {
        verified: ok,
        lastCheckedAt: Date.now(),
        processDisplayMode,
      });
      if (ok) {
        toast.success(t('settings.connectionVerified'));
      } else {
        toast.error(t('settings.connectionFailed'));
      }
    } catch (error) {
      toast.error(t('settings.connectionFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>
            {t('settings.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              {t('settings.savedConnections')}
            </h3>
            {connections.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {t('settings.noConnections')}
              </div>
            ) : (
              <div className="grid gap-2">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 text-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{connection.name}</span>
                        <span
                          className={`text-xs ${
                            connection.verified
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {connection.verified
                            ? t('settings.verified')
                            : t('settings.unverified')}
                        </span>
                        {activeConnectionId === connection.id && (
                          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                            {t('settings.active')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {connection.baseUrl}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(connection)}
                        disabled={isSaving}
                      >
                        {t('settings.verify')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onSetActiveConnection(connection.id)}
                        disabled={!connection.verified}
                      >
                        {t('settings.use')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(connection)}
                      >
                        {t('settings.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemoveConnection(connection.id)}
                      >
                        {t('settings.delete')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              {editingId
                ? t('settings.editConnection')
                : t('settings.addConnection')}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="connName">{t('settings.name')}</Label>
                <Input
                  id="connName"
                  value={formState.name}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t('settings.placeholderName')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="connUrl">{t('settings.backendUrl')}</Label>
                <Input
                  id="connUrl"
                  value={formState.baseUrl}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      baseUrl: e.target.value,
                    }))
                  }
                  placeholder={t('settings.placeholderUrl')}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="connKey">{t('settings.apiKey')}</Label>
                <Input
                  id="connKey"
                  value={formState.apiKey}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      apiKey: e.target.value,
                    }))
                  }
                  placeholder={t('settings.placeholderKey')}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t('settings.language')}</h3>
          <div className="grid gap-2">
            <Label htmlFor="language">{t('settings.language')}</Label>
            <Select
              value={language}
              onValueChange={(value) =>
                setLanguage(value as SupportedLanguage)
              }
            >
              <SelectTrigger id="language">
                <SelectValue placeholder={t('settings.selectLanguage')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">{t('languageOptions.zh')}</SelectItem>
                <SelectItem value="en">{t('languageOptions.en')}</SelectItem>
                <SelectItem value="ja">{t('languageOptions.ja')}</SelectItem>
                <SelectItem value="ko">{t('languageOptions.ko')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('settings.languageHint')}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={resetForm}>
            {t('settings.reset')}
          </Button>
          <Button onClick={handleSave}>
            {editingId
              ? t('settings.updateConnection')
              : t('settings.saveConnection')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

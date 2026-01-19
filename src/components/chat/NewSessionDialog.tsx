import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { SessionCreateOptions } from '@/types/chat';
import { useTranslation } from 'react-i18next';

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: SessionCreateOptions) => void;
  isSubmitting?: boolean;
}

const TOOL_OPTIONS = ['Skill', 'Read', 'Write', 'Bash'];
const SOURCE_OPTIONS = ['user', 'project'];

export function NewSessionDialog({
  open,
  onOpenChange,
  onCreate,
  isSubmitting,
}: NewSessionDialogProps) {
  const { t } = useTranslation();
  const [cwd, setCwd] = useState('');
  const [permissionMode, setPermissionMode] = useState('acceptEdits');
  const [allowedTools, setAllowedTools] = useState<string[]>([...TOOL_OPTIONS]);
  const [settingSources, setSettingSources] = useState<string[]>([...SOURCE_OPTIONS]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const toggleOption = (
    option: string,
    current: string[],
    setCurrent: (next: string[]) => void
  ) => {
    if (current.includes(option)) {
      setCurrent(current.filter((item) => item !== option));
    } else {
      setCurrent([...current, option]);
    }
  };

  const handleSubmit = () => {
    if (!cwd.trim()) {
      return;
    }
    onCreate({
      cwd: cwd.trim(),
      permission_mode: permissionMode,
      allowed_tools: allowedTools,
      setting_sources: settingSources,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{t('session.title')}</DialogTitle>
          <DialogDescription>
            {t('session.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="cwd">{t('session.projectPath')}</Label>
            <Input
              id="cwd"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder={t('session.projectPlaceholder')}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t('session.permissionMode')}</Label>
            <Select value={permissionMode} onValueChange={setPermissionMode}>
              <SelectTrigger>
                <SelectValue placeholder={t('session.selectPermission')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  {t('session.permissionDefault')}
                </SelectItem>
                <SelectItem value="acceptEdits">
                  {t('session.permissionAcceptEdits')}
                </SelectItem>
                <SelectItem value="bypassPermissions">
                  {t('session.permissionBypass')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t('session.allowedTools')}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {TOOL_OPTIONS.map((tool) => (
                <label key={tool} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={allowedTools.includes(tool)}
                    onCheckedChange={() =>
                      toggleOption(tool, allowedTools, setAllowedTools)
                    }
                  />
                  {tool}
                </label>
              ))}
            </div>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground">
              {t('session.advancedSettings')}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 grid gap-2">
              <Label>{t('session.settingSources')}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {SOURCE_OPTIONS.map((source) => (
                  <label key={source} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={settingSources.includes(source)}
                      onCheckedChange={() =>
                        toggleOption(source, settingSources, setSettingSources)
                      }
                    />
                    {source}
                  </label>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('session.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !cwd.trim()}>
            {isSubmitting ? t('session.creating') : t('session.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SessionCreateOptions } from '@/types/chat';
import { useTranslation } from 'react-i18next';

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: SessionCreateOptions) => void;
  isSubmitting?: boolean;
}

export function NewSessionDialog({
  open,
  onOpenChange,
  onCreate,
  isSubmitting,
}: NewSessionDialogProps) {
  const { t } = useTranslation();

  const handleSubmit = () => {
    onCreate({});
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
          <p className="text-sm text-muted-foreground">
            {t('session.description')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('session.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t('session.creating') : t('session.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

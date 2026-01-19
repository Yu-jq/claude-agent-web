import { Menu, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  onSettingsClick: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onAdminClick?: () => void;
}

export function Header({
  onSettingsClick,
  onToggleSidebar,
  sidebarOpen,
  onAdminClick,
}: HeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card/90 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={
            sidebarOpen ? t('header.hideSidebar') : t('header.showSidebar')
          }
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{t('app.title')}</div>
          <div className="text-xs text-muted-foreground">
            {t('app.subtitle')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onAdminClick && (
          <Button variant="ghost" size="sm" onClick={onAdminClick}>
            <Shield className="h-4 w-4" />
            {t('header.admin')}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onSettingsClick}>
          <Settings className="h-4 w-4" />
          {t('header.settings')}
        </Button>
      </div>
    </header>
  );
}

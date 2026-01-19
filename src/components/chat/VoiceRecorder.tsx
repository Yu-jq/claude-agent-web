import { Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  isListening: boolean;
  isSupported: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceRecorder({ isListening, isSupported, onStart, onStop }: VoiceRecorderProps) {
  const { t } = useTranslation();

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={isListening ? onStop : onStart}
      className={cn(
        'shrink-0 rounded-lg p-2 transition-all hover:bg-accent/50',
        isListening && 'bg-destructive/10 text-destructive'
      )}
      title={isListening ? t('speech.stopTitle') : t('speech.startTitle')}
    >
      <Mic className={cn('h-4 w-4', isListening && 'animate-pulse')} />
    </button>
  );
}

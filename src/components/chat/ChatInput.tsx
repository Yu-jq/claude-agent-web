import { useState, useEffect, useRef } from 'react';
import { Loader2, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceRecorder } from './VoiceRecorder';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function ChatInput({
  onSend,
  onStop,
  disabled,
  isStreaming,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  useEffect(() => {
    if (!isListening && transcript) {
      setInput((prev) => prev + (prev ? ' ' : '') + transcript);
      resetTranscript();
      textareaRef.current?.focus();
    }
  }, [isListening, transcript, resetTranscript]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled || isStreaming) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t bg-background p-3 md:p-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-full md:max-w-4xl">
        <div className="relative flex items-end gap-2 rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md focus-within:shadow-md transition-shadow">
          <div className="flex-1 flex items-end gap-2 p-2 md:p-3">
            {isSupported && (
              <VoiceRecorder
                isListening={isListening}
                isSupported={isSupported}
                onStart={startListening}
                onStop={stopListening}
              />
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening ? t('chat.listening') : t('chat.sendPlaceholder')
              }
              disabled={disabled || isListening || isStreaming}
              rows={1}
              className={cn(
                'flex-1 bg-transparent resize-none outline-none',
                'text-sm placeholder:text-muted-foreground',
                'max-h-[200px] min-h-[24px] py-1',
                'disabled:opacity-50'
              )}
            />
          </div>
          <div className="p-2 pr-2 md:pr-3">
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={onStop}
                className="rounded-lg h-9 w-9 md:h-10 md:w-10 shrink-0 bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-300"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || disabled}
                className="rounded-lg h-9 w-9 md:h-10 md:w-10 shrink-0 bg-primary hover:bg-primary/90 shadow-sm"
              >
                {disabled ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

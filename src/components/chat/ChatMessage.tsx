import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { Message, ProcessDisplayMode } from '@/types/chat';
import { useTranslation } from 'react-i18next';

interface ChatMessageProps {
  message: Message;
  processDisplayMode: ProcessDisplayMode;
  beforeContent?: React.ReactNode;
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

export function ChatMessage({
  message,
  processDisplayMode,
  beforeContent,
}: ChatMessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const kind = message.kind ?? 'message';

  if (kind === 'status') {
    return (
      <div className="w-full px-3 py-2 md:px-4">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-full bg-muted/60 px-3 py-1 text-center text-xs text-muted-foreground">
            {formatStatus(message.metadata, t)}
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'tool_use' || kind === 'tool_result') {
    const toolName =
      typeof message.metadata?.tool === 'string' ? message.metadata.tool : 'unknown';
    const toolUseId =
      typeof message.metadata?.tool_use_id === 'string'
        ? message.metadata.tool_use_id
        : 'unknown';
    const title =
      kind === 'tool_use'
        ? t('chat.toolUse', { tool: toolName })
        : t('chat.toolResult', { id: toolUseId });
    const detail =
      kind === 'tool_use'
        ? message.metadata?.input
        : message.metadata?.output;

    return (
      <div className="w-full px-3 py-3 md:px-4">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-lg border border-border/60 bg-card p-3 text-sm">
            <div className="font-medium text-foreground">{title}</div>
            {processDisplayMode === 'full' && detail !== undefined && (
              <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                {formatToolValue(detail)}
              </pre>
            )}
            {processDisplayMode === 'status' && (
              <div className="mt-1 text-xs text-muted-foreground">
                {kind === 'tool_use'
                  ? t('chat.toolRunning')
                  : t('chat.toolFinished')}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-3 py-4 md:px-4 md:py-6 overflow-x-hidden">
      <div className="mx-auto max-w-3xl w-full">
        <div className={cn('flex gap-3 md:gap-5', isUser && 'flex-row-reverse')}>
          <div
            className={cn(
              'flex h-7 w-7 md:h-8 md:w-8 shrink-0 select-none items-center justify-center rounded-md text-xs font-semibold',
              isUser
                ? 'bg-muted/60 text-foreground/80'
                : 'bg-primary/10 text-primary border border-primary/20'
            )}
          >
            {isUser ? 'You' : 'AI'}
          </div>
          <div
            className={cn(
              'flex-1 space-y-3 min-w-0',
              isUser && 'flex flex-col items-end'
            )}
          >
            {beforeContent && (
              <div className={cn('w-full', isUser && 'flex justify-end')}>
                {beforeContent}
              </div>
            )}
            {!isUser && message.isStreaming && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('chat.streaming')}
              </div>
            )}
            {message.content && (
              <div
                className={cn(
                  'prose prose-sm dark:prose-invert max-w-none leading-relaxed',
                  'prose-p:whitespace-pre-wrap prose-p:break-words',
                  'prose-li:whitespace-pre-wrap prose-li:break-words',
                  'prose-pre:whitespace-pre prose-pre:break-normal',
                  'prose-code:whitespace-pre prose-code:break-normal',
                  isUser && 'text-right'
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap m-0 text-foreground/90 break-words">
                    {message.content}
                  </p>
                ) : (
                  <div className="text-foreground/90">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="my-3 w-full overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="border border-border/60 bg-muted px-2 py-1 text-left font-semibold">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-border/60 px-2 py-1 align-top">
                            {children}
                          </td>
                        ),
                        pre: ({ children }) => (
                          <pre className="overflow-x-auto whitespace-pre">
                            {children}
                          </pre>
                        ),
                        code: ({ children, className }) => (
                          <code className={cn('whitespace-pre', className)}>
                            {children}
                          </code>
                        ),
                        p: ({ children }) => (
                          <p className="whitespace-pre-wrap break-words">
                            {children}
                          </p>
                        ),
                        li: ({ children }) => (
                          <li className="whitespace-pre-wrap break-words">
                            {children}
                          </li>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

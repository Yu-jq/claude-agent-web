import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Message, ProcessDisplayMode } from '@/types/chat';
import { useTranslation } from 'react-i18next';

interface ChatContentProps {
  messages: Message[];
  processDisplayMode: ProcessDisplayMode;
}

type RenderBlock =
  | { type: 'user'; message: Message }
  | {
      type: 'assistant';
      thinking: Message[];
      results: Message[];
      extras: Message[];
      id: string;
    }
  | { type: 'other'; message: Message };

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

function classifyTurnItem(message: Message): 'thinking' | 'result' | 'other' {
  const kind = message.kind ?? 'message';
  if (message.role === 'assistant') {
    if (kind === 'result') return 'result';
    if (
      kind === 'thinking' ||
      kind === 'status' ||
      kind === 'tool_use' ||
      kind === 'tool_result'
    ) {
      return 'thinking';
    }
    if (kind === 'message') return 'result';
  }
  return 'other';
}

function isUserTurnStart(message: Message) {
  return message.role === 'user' && (message.kind ?? 'message') === 'message';
}

function ThinkingPanel({
  items,
  processDisplayMode,
  embedded = false,
}: {
  items: Message[];
  processDisplayMode: ProcessDisplayMode;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const statusItems = items.filter((item) => (item.kind ?? 'message') === 'status');
  const stateValues = statusItems
    .map((item) => item.metadata?.state)
    .filter((state): state is string => typeof state === 'string');
  const hasError = stateValues.includes('error');
  const hasCancelled = stateValues.includes('cancelled');
  const hasDone = stateValues.includes('thinking_end');
  const isStreaming = items.some((item) => item.isStreaming);

  const state = hasError
    ? 'error'
    : hasCancelled
      ? 'cancelled'
      : hasDone || !isStreaming
        ? 'done'
        : 'thinking';

  const title =
    state === 'thinking'
      ? t('chat.thinkingHeader')
      : state === 'done'
        ? t('chat.thinkingDoneHeader')
        : state === 'cancelled'
          ? t('chat.thinkingCancelledHeader')
          : t('chat.thinkingErrorHeader');

  const [open, setOpen] = useState(state === 'thinking');

  useEffect(() => {
    if (state === 'thinking') {
      setOpen(true);
    } else if (state === 'done') {
      setOpen(false);
    }
  }, [state]);

  const panel = (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border/60 bg-card/60"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm">
        <div className="flex items-center gap-2 text-foreground/90">
          {state === 'thinking' && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{title}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border/60 px-3 py-3">
        <div className="space-y-2">
          {items.map((item) => {
            const kind = item.kind ?? 'message';
            if (kind === 'status') {
              return (
                <div
                  key={item.id}
                  className="rounded-md border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground"
                >
                  {formatStatus(item.metadata, t)}
                </div>
              );
            }

            if (kind === 'tool_use' || kind === 'tool_result') {
              if (processDisplayMode === 'status' && kind === 'tool_use') {
                return null;
              }
              const toolName =
                typeof item.metadata?.tool === 'string'
                  ? item.metadata.tool
                  : 'unknown';
              const toolUseId =
                typeof item.metadata?.tool_use_id === 'string'
                  ? item.metadata.tool_use_id
                  : 'unknown';
              const title =
                kind === 'tool_use'
                  ? t('chat.toolUse', { tool: toolName })
                  : t('chat.toolResult', { id: toolUseId });
              const detail =
                kind === 'tool_use' ? item.metadata?.input : item.metadata?.output;

              return (
                <div
                  key={item.id}
                  className="rounded-md border border-border/60 bg-background/60 px-3 py-2 text-xs"
                >
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
              );
            }

            if (kind === 'thinking') {
              const content = item.content?.trim();
              return (
                <div
                  key={item.id}
                  className="rounded-md border border-border/60 bg-background/60 px-3 py-2 text-xs"
                >
                  {content ? (
                    <div className="whitespace-pre-wrap text-sm text-foreground/90">
                      {content}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {t('chat.assistantThinking')}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  if (embedded) {
    return panel;
  }

  return (
    <div className="w-full px-3 py-2 md:px-4">
      <div className="mx-auto max-w-3xl">{panel}</div>
    </div>
  );
}

export function ChatContent({ messages, processDisplayMode }: ChatContentProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const blocks = useMemo<RenderBlock[]>(() => {
    const rendered: RenderBlock[] = [];
    let currentUser: Message | null = null;
    let currentItems: Message[] = [];

    const flush = () => {
      if (!currentUser && currentItems.length === 0) {
        return;
      }
      if (currentUser) {
        rendered.push({ type: 'user', message: currentUser });
      }

      const thinkingItems: Message[] = [];
      const resultItems: Message[] = [];
      const otherItems: Message[] = [];
      for (const item of currentItems) {
        const classification = classifyTurnItem(item);
        if (classification === 'thinking') {
          thinkingItems.push(item);
        } else if (classification === 'result') {
          resultItems.push(item);
        } else {
          otherItems.push(item);
        }
      }

      if (thinkingItems.length || resultItems.length || otherItems.length) {
        rendered.push({
          type: 'assistant',
          thinking: thinkingItems,
          results: resultItems,
          extras: otherItems,
          id:
            (currentUser ? `assistant-${currentUser.id}` : null) ??
            thinkingItems[0]?.id ??
            resultItems[0]?.id ??
            `assistant-${rendered.length}`,
        });
      }

      currentUser = null;
      currentItems = [];
    };

    for (const message of messages) {
      if (isUserTurnStart(message)) {
        flush();
        currentUser = message;
        currentItems = [];
        continue;
      }

      if (currentUser || message.role === 'assistant') {
        currentItems.push(message);
        continue;
      }

      rendered.push({ type: 'other', message });
    }

    flush();
    return rendered;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 md:p-8 bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="mx-auto w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <svg
              className="w-7 h-7 md:w-8 md:h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-medium text-foreground">
            {t('chat.welcomeTitle')}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            {t('chat.welcomeDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {blocks.map((block) => {
        if (block.type === 'assistant') {
          const hasThinking = block.thinking.length > 0;
          const thinkingPanel = hasThinking ? (
            <ThinkingPanel
              items={block.thinking}
              processDisplayMode={processDisplayMode}
              embedded
            />
          ) : undefined;
          const hasResults = block.results.length > 0;

          return (
            <div key={block.id} className="contents">
              {hasResults ? (
                block.results.map((result, index) => (
                  <ChatMessage
                    key={`${result.id}-result-${index}`}
                    message={result}
                    processDisplayMode={processDisplayMode}
                    beforeContent={index === 0 ? thinkingPanel : undefined}
                  />
                ))
              ) : hasThinking ? (
                <ChatMessage
                  key={`${block.id}-thinking-only`}
                  message={{
                    id: `${block.id}-thinking-only`,
                    role: 'assistant',
                    content: '',
                    kind: 'result',
                    timestamp:
                      block.thinking[0]?.timestamp ?? block.results[0]?.timestamp ?? Date.now(),
                  }}
                  processDisplayMode={processDisplayMode}
                  beforeContent={thinkingPanel}
                />
              ) : null}
              {block.extras.map((extra) => (
                <ChatMessage
                  key={extra.id}
                  message={extra}
                  processDisplayMode={processDisplayMode}
                />
              ))}
            </div>
          );
        }

        return (
          <ChatMessage
            key={block.message.id}
            message={block.message}
            processDisplayMode={processDisplayMode}
          />
        );
      })}
    </div>
  );
}

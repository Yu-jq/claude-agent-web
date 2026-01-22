import { useState } from 'react';
import { Check, MessageSquare, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/chat';
import { useTranslation } from 'react-i18next';

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  connectionLabel?: string;
}

export function ChatSidebar({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  connectionLabel,
}: ChatSidebarProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const formatTitleLabel = (title: string) => {
    if (title.length <= 10) return title;
    return `${title.slice(0, 10)}...`;
  };

  const startRename = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setDraftTitle(conversation.title || '');
  };

  const cancelRename = () => {
    setEditingId(null);
    setDraftTitle('');
  };

  const confirmRename = (conversationId: string) => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) {
      return;
    }
    onRenameConversation(conversationId, nextTitle);
    cancelRename();
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card backdrop-blur-sm max-lg:absolute max-lg:left-0 max-lg:top-0 max-lg:z-50 max-lg:shadow-xl lg:relative">
      <div className="p-3 border-b space-y-2">
        {connectionLabel && (
          <div className="text-xs text-muted-foreground truncate">
            {connectionLabel}
          </div>
        )}
        <Button onClick={onNewConversation} className="w-full rounded-lg" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('chat.newChat')}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('chat.noConversations')}
            </div>
          ) : (
            conversations.map((conversation) => {
              const isEditing = editingId === conversation.id;
              return (
                <div
                  key={conversation.id}
                  className={cn(
                    'group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-accent',
                    currentConversation?.id === conversation.id && 'bg-accent'
                  )}
                  onClick={() => onSelectConversation(conversation)}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            confirmRename(conversation.id);
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelRename();
                          }
                        }}
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(event) => {
                          event.stopPropagation();
                          confirmRename(conversation.id);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(event) => {
                          event.stopPropagation();
                          cancelRename();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div
                          className="truncate"
                          title={conversation.title || t('chat.newChat')}
                        >
                          {formatTitleLabel(conversation.title || t('chat.newChat'))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                    {!isEditing && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(event) => {
                            event.stopPropagation();
                            startRename(conversation);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteConversation(conversation.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

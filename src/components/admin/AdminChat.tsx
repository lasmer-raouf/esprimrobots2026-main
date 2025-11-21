// src/components/admin/AdminChat.tsx
import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import UserAvatar from '@/components/ui/user-avatar';

type NormalizedMessage = {
  id: number;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  read: boolean;
  _raw?: any;
};

type Member = {
  id: string;
  name: string;
  image?: string | null;
};

/**
 * ChatInput: isolated input component that manages its own value & caret.
 * Exposes `focus()` via ref so parent can focus when selecting a conversation.
 */
type ChatInputHandle = {
  focus: () => void;
};

const ChatInput = React.forwardRef<ChatInputHandle, { onSend: (content: string) => Promise<void> | void; disabled?: boolean }>(
  ({ onSend, disabled }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [value, setValue] = useState('');
    const [sending, setSending] = useState(false);

    // preserve selection across re-renders (shouldn't be necessary since it's local, but safe)
    const selectionRef = useRef<{ start: number; end: number } | null>(null);
    useLayoutEffect(() => {
      const t = textareaRef.current;
      if (!t) return;
      const s = selectionRef.current;
      if (s) {
        try {
          t.setSelectionRange(s.start, s.end);
        } catch {
          // ignore
        }
      }
    }, [value]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          textareaRef.current?.focus();
        },
      }),
      []
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      selectionRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd };
    };

    const doSend = async () => {
      const trimmed = value.trim();
      if (!trimmed || sending || disabled) return;
      setSending(true);
      try {
        await onSend(trimmed);
        // clear only if send succeeded (parent may throw / reject if something goes wrong)
        setValue('');
      } catch (err) {
        // parent handled toasts; keep current value so user doesn't lose typed text
        console.error('ChatInput: send failed', err);
      } finally {
        setSending(false);
      }
    };

    return (
      <div className="flex gap-3 px-3 py-3">
        <Textarea
          ref={textareaRef as any}
          value={value}
          onChange={handleChange}
          placeholder="Type your message..."
          rows={2}
          className="flex-1"
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              await doSend();
            }
          }}
          disabled={disabled}
        />
        <Button onClick={doSend} disabled={sending || disabled}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';

/**
 * MemberRow - memoized to avoid unnecessary re-renders from parent message updates
 */
const MemberRow = React.memo(function MemberRow({
  member,
  selected,
  onSelect,
  splitName,
  getLastMessage,
  getUnreadCount,
}: {
  member: Member;
  selected: boolean;
  onSelect: (id: string) => void;
  splitName: (fullName?: string | null) => { first: string; last: string };
  getLastMessage: (memberId: string) => NormalizedMessage | null;
  getUnreadCount: (memberId: string) => number;
}) {
  const { first, last } = splitName(member.name);
  const unread = getUnreadCount(member.id);
  const lastMsg = getLastMessage(member.id);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selected) ref.current?.focus();
  }, [selected]);

  return (
    <div
      role="button"
      tabIndex={0}
      ref={ref}
      data-id={member.id}
      aria-pressed={selected}
      title={member.name}
      onClick={() => onSelect(member.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(member.id);
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const nodes = Array.from(document.querySelectorAll<HTMLElement>('[role="button"]') ?? []);
          const idx = nodes.findIndex((n) => n.dataset.id === member.id);
          const next = e.key === 'ArrowDown' ? nodes[idx + 1] : nodes[idx - 1];
          next?.focus();
        }
      }}
      className={`w-full flex items-start gap-5 px-5 py-4 rounded-lg transition-all outline-none
        ${selected ? 'bg-primary/8 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}
    >
      <UserAvatar firstName={first || 'U'} lastName={last || ''} src={member.image ?? undefined} sizeClass="w-16 h-16" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="truncate">
            <div className={`font-medium ${selected ? 'text-primary' : ''}`}>{member.name}</div>
          </div>
          <div className="ml-3 text-right">
            <div className="text-sm text-muted-foreground">{lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString() : ''}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-muted-foreground truncate">{lastMsg ? lastMsg.content.slice(0, 140) : 'No messages yet'}</p>
          {unread > 0 && (
            <Badge variant="destructive" className="ml-4">
              {unread}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

export function AdminChat() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const pollingRef = useRef<number | null>(null);
  const selectionListRef = useRef<HTMLDivElement | null>(null);

  // resolved admin id
  const currentUserIdRef = useRef<string | null>(null);

  // typing guard: when input is focused we avoid clobbering it with setMessages
  const inputFocusedRef = useRef(false);
  const pendingMessagesRef = useRef<NormalizedMessage[] | null>(null);
  const lastMessagesKeyRef = useRef<string>('');

  // ref to ChatInput so we can focus it when selecting a member
  const chatInputRef = useRef<ChatInputHandle | null>(null);

  // ref to messages container for scrolling
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // helper: normalize DB rows
  const normalize = (row: any): NormalizedMessage => {
    const createdAt = row.created_at ?? row.sent_at ?? null;
    const ts = typeof createdAt === 'number' ? createdAt : createdAt ? new Date(createdAt).getTime() : Date.now();
    const from = row.sender_id ?? row.from ?? row.sender ?? 'unknown';
    const to = row.recipient_id ?? row.to ?? row.recipient ?? row.recipient_role ?? 'admin';
    return {
      id: Number(row.id ?? Math.floor(Math.random() * -1000000)),
      from: String(from),
      to: String(to),
      content: String(row.content ?? ''),
      timestamp: ts,
      read: Boolean(row.read ?? false),
      _raw: row,
    };
  };

  const splitName = (fullName?: string | null) => {
    if (!fullName) return { first: 'U', last: '' };
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0] ?? '';
    const last = parts.length > 1 ? parts.slice(-1)[0] : '';
    return { first, last };
  };

  // resolve admin id
  const resolveCurrentUser = async (): Promise<string | null> => {
    if (currentUserIdRef.current) return currentUserIdRef.current;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('auth.getUser error', error);
        return null;
      }
      const id = data?.user?.id ?? null;
      currentUserIdRef.current = id;
      return id;
    } catch (err) {
      console.error('resolveCurrentUser failed', err);
      return null;
    }
  };

  // load members
  const loadMembers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, name, image').order('name', { ascending: true });
      if (error) {
        console.error('loadMembers error', error);
        toast({ title: 'Error', description: 'Failed to load members.', variant: 'destructive' });
        return;
      }
      if (mountedRef.current) setMembers((data ?? []) as Member[]);
    } catch (err) {
      console.error('loadMembers unexpected', err);
    }
  };

  /**
   * load messages (modern then legacy)
   * if input is focused, stash results in pendingMessagesRef instead of calling setMessages
   */
  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (!error && data) {
        const serverNormalized = (data as any[]).map(normalize);
        const key = serverNormalized.map((m) => `${m.id}:${m.timestamp}`).join('|');
        if (key === lastMessagesKeyRef.current) return;
        lastMessagesKeyRef.current = key;

        if (inputFocusedRef.current) {
          pendingMessagesRef.current = serverNormalized;
          return;
        }
        if (mountedRef.current) setMessages(serverNormalized);
        return;
      }

      if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message ?? ''))) {
        const { data: d2, error: err2 } = await supabase.from('messages').select('*').order('sent_at', { ascending: true });
        if (!err2 && d2) {
          const serverNormalized = (d2 as any[]).map(normalize);
          const key = serverNormalized.map((m) => `${m.id}:${m.timestamp}`).join('|');
          if (key === lastMessagesKeyRef.current) return;
          lastMessagesKeyRef.current = key;

          if (inputFocusedRef.current) {
            pendingMessagesRef.current = serverNormalized;
            return;
          }
          if (mountedRef.current) setMessages(serverNormalized);
          return;
        }
        console.error('Both message queries failed', error, err2);
        toast({ title: 'Error', description: 'Failed to load messages.', variant: 'destructive' });
        return;
      }

      if (error) {
        console.error('loadMessages error', error);
      }
    } catch (err) {
      console.error('loadMessages unexpected', err);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      await resolveCurrentUser();
      await loadMembers();
      await loadMessages();
    })();
    pollingRef.current = window.setInterval(loadMessages, 2000);
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadMessages]);

  // auto-scroll when messages or selectedMember changes — but avoid auto-scrolling while input is focused
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (inputFocusedRef.current) return;
    // scroll to bottom; use 'auto' for immediate effect if many messages to avoid long smooth scrolls
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    } catch {
      // fallback
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, selectedMemberId]);

  // ensure document-level focusin/focusout updates inputFocusedRef and applies pending messages on blur
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('textarea') || target.closest('input')) {
        inputFocusedRef.current = true;
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('textarea') || target.closest('input')) {
        inputFocusedRef.current = false;
        if (pendingMessagesRef.current) {
          setMessages(pendingMessagesRef.current);
          pendingMessagesRef.current = null;
        }
      }
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const getUnreadCount = (memberId: string) => {
    const adminId = currentUserIdRef.current ?? 'admin';
    return messages.filter((m) => m.from === memberId && (m.to === adminId || m.to === 'admin') && !m.read).length;
  };

  const getMemberMessages = (memberId: string) => {
    const adminId = currentUserIdRef.current ?? 'admin';
    return messages.filter(
      (m) =>
        (m.from === memberId && (m.to === adminId || m.to === 'admin')) || ((m.from === adminId || m.from === 'admin') && m.to === memberId)
    );
  };

  const getLastMessage = (memberId: string) => {
    const list = messages
      .filter((m) => (m.from === memberId && m.to !== undefined) || m.to === memberId || m.from === (currentUserIdRef.current ?? 'admin') || m.to === (currentUserIdRef.current ?? 'admin'))
      .filter((m) => (m.from === memberId && (m.to === (currentUserIdRef.current ?? 'admin') || m.to === 'admin')) || (m.to === memberId && (m.from === (currentUserIdRef.current ?? 'admin') || m.from === 'admin')))
      .sort((a, b) => b.timestamp - a.timestamp);
    return list[0] ?? null;
  };

  // Send implementation now accepts content param from ChatInput
  const handleSend = useCallback(
    async (content: string) => {
      if (!selectedMemberId || !content.trim()) {
        toast({ title: 'No recipient', description: 'Select a member before sending.', variant: 'destructive' });
        throw new Error('No recipient');
      }
      const trimmed = content.trim();

      // optimistic
      const optimistic: NormalizedMessage = {
        id: Date.now(),
        from: currentUserIdRef.current ?? 'admin',
        to: selectedMemberId,
        content: trimmed,
        timestamp: Date.now(),
        read: false,
      };
      setMessages((p) => [...p, optimistic]);

      try {
        const senderId = (await resolveCurrentUser()) ?? null;
        if (!senderId) {
          toast({ title: 'Not signed in', description: 'Cannot send message because current user is not known.', variant: 'destructive' });
          // rollback optimistic
          setMessages((p) => p.filter((m) => m.id !== optimistic.id));
          throw new Error('Not signed in');
        }

        const payloadModern: any = {
          sender_id: senderId,
          recipient_id: selectedMemberId,
          recipient_role: null,
          content: trimmed,
          created_at: new Date().toISOString(),
          read: false,
        };

        const { data, error } = await supabase.from('messages').insert([payloadModern]).select();
        if (!error && data && data.length > 0) {
          setMessages((prev) => {
            const withoutOpt = prev.filter((m) => m.id !== optimistic.id);
            return [...withoutOpt, normalize(data[0])];
          });
          toast({ title: 'Message Sent', description: 'Your message has been sent.' });
          return;
        }

        // fallback legacy shape
        if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message ?? ''))) {
          const payloadLegacy = {
            from: senderId,
            to: selectedMemberId,
            content: trimmed,
            sent_at: new Date().toISOString(),
            read: false,
          };
          const { data: d2, error: err2 } = await supabase.from('messages').insert([payloadLegacy]).select();
          if (!err2 && d2 && d2.length > 0) {
            setMessages((prev) => {
              const withoutOpt = prev.filter((m) => m.id !== optimistic.id);
              return [...withoutOpt, normalize(d2[0])];
            });
            toast({ title: 'Message Sent', description: 'Your message has been sent.' });
            return;
          }
          console.error('Send failed (both shapes)', error, err2);
          toast({ title: 'Send failed', description: 'Unable to send message.', variant: 'destructive' });
          // rollback optimistic
          setMessages((p) => p.filter((m) => m.id !== optimistic.id));
          throw new Error('Send failed');
        } else if (error) {
          console.error('Send error', error);
          toast({ title: 'Send failed', description: error.message ?? 'Unable to send message', variant: 'destructive' });
          setMessages((p) => p.filter((m) => m.id !== optimistic.id));
          throw error;
        }
      } catch (err) {
        // rethrow so ChatInput can decide whether to clear or not
        throw err;
      } finally {
        // refresh server state but do not auto-scroll or force-focus; if input is focused, defer update
        await loadMessages();
      }
    },
    [selectedMemberId, toast, loadMessages]
  );

  const markAsRead = useCallback(
    async (memberId: string) => {
      try {
        const adminId = await resolveCurrentUser();
        if (!adminId) return;
        const { error } = await supabase.from('messages').update({ read: true }).eq('sender_id', memberId).eq('recipient_id', adminId).eq('read', false);
        if (!error) {
          setMessages((prev) => prev.map((m) => (m.from === memberId && (m.to === adminId || m.to === 'admin') ? { ...m, read: true } : m)));
          return;
        }
        const { error: err2 } = await supabase.from('messages').update({ read: true }).eq('from', memberId).eq('to', adminId).eq('read', false);
        if (!err2) setMessages((prev) => prev.map((m) => (m.from === memberId ? { ...m, read: true } : m)));
      } catch (err) {
        console.error('markAsRead error', err);
      } finally {
        await loadMessages();
      }
    },
    [loadMessages]
  );

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    markAsRead(memberId);
    // focus the input but do not force-scroll or otherwise change the messages area
    chatInputRef.current?.focus();
    // if there were pending server messages while input was focused earlier, apply them now
    if (!inputFocusedRef.current && pendingMessagesRef.current) {
      setMessages(pendingMessagesRef.current);
      pendingMessagesRef.current = null;
    }
  };

  // mark input focus/blur so loadMessages can defer applying updates
  const handleInputFocus = () => {
    inputFocusedRef.current = true;
  };
  const handleInputBlur = () => {
    inputFocusedRef.current = false;
    if (pendingMessagesRef.current) {
      setMessages(pendingMessagesRef.current);
      pendingMessagesRef.current = null;
    }
  };

  // expose small wrapper for ChatInput onSend that also notifies focus state
  const chatOnSend = useCallback(
    async (content: string) => {
      // ensure focus guard is consistent
      handleInputFocus();
      try {
        await handleSend(content);
      } finally {
        // keep focus state as-is; parent won't forcibly blur
        // leave it to ChatInput to manage its own focus
      }
    },
    [handleSend]
  );

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const memberMessages = selectedMemberId ? getMemberMessages(selectedMemberId) : [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Member Communications</h1>
          <p className="text-muted-foreground">Chat with club members</p>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        <Card className="md:col-span-5">
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4" ref={selectionListRef}>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                selected={selectedMemberId === member.id}
                onSelect={handleSelectMember}
                splitName={splitName}
                getLastMessage={getLastMessage}
                getUnreadCount={getUnreadCount}
              />
            ))}
            {members.length === 0 && <p className="text-sm text-muted-foreground">No members found</p>}
          </CardContent>
        </Card>

        {/* MAIN CHAT CARD */}
        {/* Note: removed fixed height (h-[760px]) so card is flexible.
            CardContent uses flex-1 flex-col min-h-0 so overflow-y children can work. */}
        <Card className="md:col-span-7 flex flex-col">
          <CardHeader>
            <CardTitle>{selectedMember ? `Chat with ${selectedMember.name}` : 'Select a member'}</CardTitle>
          </CardHeader>

          {/* CardContent must be a flex column with min-h-0 to allow proper overflow behavior */}
          <CardContent className="flex-1 flex flex-col min-h-0 relative">
            {selectedMember ? (
              <>
                {/* messages container: flex-1 so it consumes available space and scrolls internally */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto space-y-6 px-3 py-4"
                  aria-live="polite"
                >
                  {memberMessages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No messages yet. Start a conversation!</p>
                  ) : (
                    memberMessages.map((msg) => {
                      const adminId = currentUserIdRef.current ?? 'admin';
                      const isFromAdmin = msg.from === adminId || msg.from === 'admin';
                      const otherMember = !isFromAdmin ? members.find((m) => m.id === msg.from) : null;
                      const { first, last } = splitName(otherMember?.name ?? '');
                      return (
                        <div key={msg.id} className={`flex ${isFromAdmin ? 'justify-end' : 'justify-start'} items-end`}>
                          {!isFromAdmin && (
                            <div className="mr-4">
                              <UserAvatar firstName={first || 'U'} lastName={last || ''} src={otherMember?.image ?? undefined} sizeClass="w-8 h-8" />
                            </div>
                          )}

                          <div className={`max-w-[88%] rounded-lg p-4 ${isFromAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-2">{new Date(msg.timestamp).toLocaleString()}</p>
                          </div>

                          {isFromAdmin && <div className="ml-4" />}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* input wrapper sits after messages container; mt-auto ensures it stays at the bottom */}
                <div className="mt-auto border-t border-muted/10">
                  <ChatInput ref={chatInputRef} onSend={chatOnSend} disabled={!selectedMemberId} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a member to start chatting</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AdminChat;

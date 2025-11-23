// src/components/admin/AdminChat.tsx
import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import UserAvatar from '@/components/ui/user-avatar';
import { ChatInput, ChatInputHandle } from '@/components/chat/ChatInput';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatUserList, ChatUser } from '@/components/chat/ChatUserList';

type NormalizedMessage = {
  id: number;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  read: boolean;
  _raw?: any;
};



export function AdminChat() {
  const { toast } = useToast();
  const [members, setMembers] = useState<ChatUser[]>([]);
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
      if (mountedRef.current) setMembers((data ?? []) as ChatUser[]);
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
  // REMOVED global listeners in favor of direct props on ChatInput
  // useEffect(() => { ... }, []);

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
        <div className="md:col-span-5">
          <ChatUserList
            title="Members"
            users={members}
            selectedUserId={selectedMemberId}
            onSelectUser={setSelectedMemberId}
            getLastMessage={getLastMessage}
            getUnreadCount={getUnreadCount}
          />
        </div>
        {/* MAIN CHAT CARD */}
        {/* Note: removed fixed height (h-[760px]) so card is flexible.
            CardContent uses flex-1 flex-col min-h-0 so overflow-y children can work. */}
        {/* MAIN CHAT CARD */}
        <Card className="md:col-span-7 h-[600px] flex flex-col">
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
                        <MessageBubble
                          key={`${msg.id}-${msg.timestamp}`}
                          message={msg}
                          isOwnMessage={isFromAdmin}
                          avatar={
                            !isFromAdmin ? (
                              <UserAvatar
                                firstName={first || 'U'}
                                lastName={last || ''}
                                src={otherMember?.image ?? undefined}
                                sizeClass="w-8 h-8"
                              />
                            ) : undefined
                          }
                        />
                      );
                    })
                  )}
                </div>

                {/* input wrapper sits after messages container; mt-auto ensures it stays at the bottom */}
                <div className="mt-auto border-t border-muted/10">
                  <ChatInput ref={chatInputRef} onSend={chatOnSend} disabled={!selectedMemberId} onFocus={handleInputFocus} onBlur={handleInputBlur} />
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

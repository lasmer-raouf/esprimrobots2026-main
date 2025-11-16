import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

type NormalizedMessage = {
  id: number;
  from: string; // sender id or 'admin'
  to: string; // recipient id or 'admin'
  content: string;
  timestamp: number; // ms
  read: boolean;
  _raw?: any;
};

type Member = {
  id: string;
  name: string;
};

export function AdminChat() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const mountedRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<number | null>(null);
  const [sending, setSending] = useState(false);

  const scrollToBottom = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }));

  useEffect(() => {
    mountedRef.current = true;
    loadMembers();
    loadMessages();
    pollingRef.current = window.setInterval(loadMessages, 2000);
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Normalize DB row to our shape (handles modern and legacy)
  const normalize = (row: any): NormalizedMessage => {
    const createdAt = row.created_at ?? row.sent_at ?? null;
    const ts = typeof createdAt === 'number' ? createdAt : createdAt ? new Date(createdAt).getTime() : Date.now();
    const from = row.sender_id ?? row.from ?? row.sender ?? 'unknown';
    const to = row.recipient_id ?? row.to ?? row.recipient ?? 'admin';
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

  // Load members
  const loadMembers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, name').order('name', { ascending: true });
      if (error) {
        console.error('loadMembers error', error);
        toast({ title: 'Error', description: 'Failed to load members.', variant: 'destructive' });
        return;
      }
      if (mountedRef.current) setMembers(data ?? []);
    } catch (err) {
      console.error('loadMembers unexpected', err);
    }
  };

  // Load messages — try modern then fallback to legacy
  const loadMessages = async () => {
    try {
      // Modern: order by created_at
      const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (!error && data) {
        if (mountedRef.current) {
          setMessages((data as any[]).map(normalize));
          scrollToBottom();
        }
        return;
      }

      // If column missing or other schema error, fallback to legacy
      if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message ?? ''))) {
        const { data: d2, error: err2 } = await supabase.from('messages').select('*').order('sent_at', { ascending: true });
        if (!err2 && d2) {
          if (mountedRef.current) {
            setMessages((d2 as any[]).map(normalize));
            scrollToBottom();
          }
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
  };

  const getUnreadCount = (memberId: string) =>
    messages.filter((m) => m.from === memberId && m.to === 'admin' && !m.read).length;

  const getMemberMessages = (memberId: string) =>
    messages.filter((m) => (m.from === memberId && m.to === 'admin') || (m.from === 'admin' && m.to === memberId));

  // Send: try modern insert first, fallback to legacy
  const handleSend = async () => {
    if (!selectedMemberId || !message.trim() || sending) return;
    setSending(true);
    const content = message.trim();
    const optimistic: NormalizedMessage = {
      id: Date.now(),
      from: 'admin',
      to: selectedMemberId,
      content,
      timestamp: Date.now(),
      read: false,
    };
    setMessages((p) => [...p, optimistic]);
    setMessage('');
    scrollToBottom();

    try {
      const payloadModern = {
        sender_id: 'admin', // admin identity string — adjust if you use a UUID for admin
        recipient_id: selectedMemberId,
        content,
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

      // If schema error, fallback to legacy
      if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message ?? ''))) {
        const payloadLegacy = {
          from: 'admin',
          to: selectedMemberId,
          content,
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
      } else if (error) {
        console.error('Send error', error);
        toast({ title: 'Send failed', description: error.message ?? 'Unable to send message', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Unexpected send error', err);
      toast({ title: 'Send failed', description: 'Unexpected error.', variant: 'destructive' });
    } finally {
      setSending(false);
      // Refresh messages
      loadMessages();
    }
  };

  // Mark all messages from a member as read (tries modern then legacy)
  const markAsRead = async (memberId: string) => {
    try {
      const { error } = await supabase.from('messages').update({ read: true }).eq('sender_id', memberId).eq('read', false);
      if (!error) {
        setMessages((prev) => prev.map((m) => (m.from === memberId ? { ...m, read: true } : m)));
        return;
      }
      // fallback
      const { error: err2 } = await supabase.from('messages').update({ read: true }).eq('from', memberId).eq('read', false);
      if (!err2) setMessages((prev) => prev.map((m) => (m.from === memberId ? { ...m, read: true } : m)));
    } catch (err) {
      console.error('markAsRead error', err);
    } finally {
      loadMessages();
    }
  };

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

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((member) => {
              const unread = getUnreadCount(member.id);
              return (
                <Button
                  key={member.id}
                  variant={selectedMemberId === member.id ? 'default' : 'ghost'}
                  className="w-full justify-between"
                  onClick={() => {
                    setSelectedMemberId(member.id);
                    markAsRead(member.id);
                  }}
                >
                  <span>{member.name}</span>
                  {unread > 0 && <Badge variant="destructive">{unread}</Badge>}
                </Button>
              );
            })}
            {members.length === 0 && <p className="text-sm text-muted-foreground">No members found</p>}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle>{selectedMember ? `Chat with ${selectedMember.name}` : 'Select a member'}</CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col">
            {selectedMember ? (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 px-1">
                  {memberMessages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No messages yet. Start a conversation!</p>
                  ) : (
                    memberMessages.map((msg) => {
                      const isFromAdmin = msg.from === 'admin';
                      return (
                        <div key={msg.id} className={`flex ${isFromAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-lg p-3 ${isFromAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-sm whitespace-pre-line">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button onClick={handleSend} disabled={sending}>
                    <Send className="h-4 w-4" />
                  </Button>
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

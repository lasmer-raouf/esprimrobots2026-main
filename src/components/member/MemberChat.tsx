import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type NormalizedMessage = {
  id: number;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  read: boolean;
  _raw?: any;
};

export function MemberChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const pollingRef = useRef<number | null>(null);
  const [sending, setSending] = useState(false);

  if (!user) return null;

  const scrollToBottom = () =>
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));

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

  const loadMessages = async () => {
    if (!mountedRef.current) return;
    try {
      // modern
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (!error && data) {
        if (mountedRef.current) {
          setMessages((data as any[]).map(normalize));
          scrollToBottom();
        }
        return;
      }

      if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message ?? ''))) {
        // fallback legacy
        const { data: d2, error: err2 } = await supabase
          .from('messages')
          .select('*')
          .or(`from.eq.${user.id},to.eq.${user.id}`)
          .order('sent_at', { ascending: true });

        if (!err2 && d2) {
          if (mountedRef.current) {
            setMessages((d2 as any[]).map(normalize));
            scrollToBottom();
          }
          return;
        }
        console.error('Both messages queries failed', error, err2);
        toast({ title: 'Error', description: 'Failed to load messages.', variant: 'destructive' });
        return;
      }

      if (error) {
        console.error('loadMessages error', error);
        toast({ title: 'Error', description: 'Failed to load messages.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('loadMessages unexpected', err);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    loadMessages();
    pollingRef.current = window.setInterval(loadMessages, 2000);
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    const content = message.trim();
    setMessage('');

    // optimistic
    const optimistic: NormalizedMessage = {
      id: Date.now(),
      from: user.id,
      to: 'admin',
      content,
      timestamp: Date.now(),
      read: false,
    };
    setMessages((p) => [...p, optimistic]);
    scrollToBottom();

    try {
      const payloadModern = {
        sender_id: user.id,
        recipient_id: 'admin',
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
        toast({ title: 'Message Sent', description: 'Your message has been sent to the admin.' });
        return;
      }

      // fallback to legacy
      if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message ?? ''))) {
        const payloadLegacy = {
          from: user.id,
          to: 'admin',
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
          toast({ title: 'Message Sent', description: 'Your message has been sent to the admin.' });
          return;
        }
        console.error('Send failed for both shapes', error, err2);
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
      loadMessages();
    }
  };

  const markAsRead = async () => {
    try {
      const { error } = await supabase.from('messages').update({ read: true }).eq('recipient_id', user.id).eq('read', false);
      if (!error) {
        setMessages((p) => p.map((m) => (m.to === user.id ? { ...m, read: true } : m)));
        return;
      }
      // fallback
      await supabase.from('messages').update({ read: true }).eq('to', user.id).eq('read', false);
      setMessages((p) => p.map((m) => (m.to === user.id ? { ...m, read: true } : m)));
    } catch (err) {
      console.error('markAsRead failed', err);
    }
  };

  const myMessages = messages.filter((m) => m.from === user.id || m.to === user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Chat with Admin</h1>
        <p className="text-muted-foreground">Send messages to the club administrators</p>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-1">
            {myMessages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No messages yet. Start a conversation!</p>
            ) : (
              myMessages.map((msg) => {
                const isFromMe = msg.from === user.id;
                return (
                  <div key={msg.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${isFromMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="text-sm whitespace-pre-line">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
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
            <Button variant="ghost" onClick={markAsRead}>Mark as read</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

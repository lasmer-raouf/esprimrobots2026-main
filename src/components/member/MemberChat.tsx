import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { clubDB, saveDatabase } from '@/lib/database';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function MemberChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(
    clubDB.messages.filter(
      m => (m.from === user?.id || m.to === user?.id)
    )
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(
        clubDB.messages.filter(
          m => (m.from === user?.id || m.to === user?.id)
        )
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: clubDB.messages.length + 1,
      from: user.id,
      to: 'admin',
      content: message,
      timestamp: Date.now(),
      read: false,
    };

    clubDB.messages.push(newMessage);
    saveDatabase();
    setMessages([...messages, newMessage]);
    setMessage('');

    toast({
      title: 'Message Sent',
      description: 'Your message has been sent to the admin.',
    });
  };

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
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No messages yet. Start a conversation!</p>
            ) : (
              messages.map((msg) => {
                const isFromMe = msg.from === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isFromMe
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
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
            <Button onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

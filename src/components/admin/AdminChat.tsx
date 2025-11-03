import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { clubDB, saveDatabase } from '@/lib/database';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Member {
  id: string;
  name: string;
}

export function AdminChat() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [, setUpdate] = useState(0);

  useEffect(() => {
    loadMembers();
    const interval = setInterval(() => {
      setUpdate(prev => prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadMembers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name');
      
      if (profiles) {
        setMembers(profiles);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const getUnreadCount = (memberId: string) => {
    return clubDB.messages.filter(
      m => m.from === memberId && m.to === 'admin' && !m.read
    ).length;
  };

  const getMemberMessages = (memberId: string) => {
    return clubDB.messages.filter(
      m => (m.from === memberId && m.to === 'admin') || (m.from === 'admin' && m.to === memberId)
    ).sort((a, b) => a.timestamp - b.timestamp);
  };

  const handleSend = () => {
    if (!selectedMemberId || !message.trim()) return;

    const newMessage = {
      id: clubDB.messages.length + 1,
      from: 'admin',
      to: selectedMemberId,
      content: message,
      timestamp: Date.now(),
      read: false,
    };

    clubDB.messages.push(newMessage);
    saveDatabase();
    setMessage('');

    toast({
      title: 'Message Sent',
      description: 'Your message has been sent.',
    });
  };

  const markAsRead = (memberId: string) => {
    clubDB.messages.forEach(m => {
      if (m.from === memberId && m.to === 'admin' && !m.read) {
        m.read = true;
      }
    });
    saveDatabase();
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    markAsRead(memberId);
  };

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const messages = selectedMemberId ? getMemberMessages(selectedMemberId) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Member Communications</h1>
        <p className="text-muted-foreground">Chat with club members</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((member) => {
              const unreadCount = getUnreadCount(member.id);
              return (
                <Button
                  key={member.id}
                  variant={selectedMemberId === member.id ? 'default' : 'ghost'}
                  className="w-full justify-between"
                  onClick={() => handleSelectMember(member.id)}
                >
                  <span>{member.name}</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle>
              {selectedMember ? `Chat with ${selectedMember.name}` : 'Select a member'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {selectedMember ? (
              <>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {messages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No messages yet. Start a conversation!
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const isFromAdmin = msg.from === 'admin';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isFromAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isFromAdmin
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a member to start chatting
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

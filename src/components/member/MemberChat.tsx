// src/components/member/MemberChat.tsx
import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type NormalizedMessage = {
  id: number;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  read: boolean;
  _raw?: any;
};

export function MemberChat(): JSX.Element | null {
  const { user } = useAuth();
  const { toast } = useToast();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const pollingRef = useRef<number | null>(null);

  if (!user) return null;

  const scrollToBottom = () =>
    requestAnimationFrame(() =>
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    );

  const normalize = (row: any): NormalizedMessage => {
    const createdAt = row.created_at ?? row.sent_at ?? null;
    const ts =
      typeof createdAt === "number"
        ? createdAt
        : createdAt
        ? new Date(createdAt).getTime()
        : Date.now();

    const from = row.sender_id ?? row.from ?? row.sender ?? "unknown";
    const to =
      row.recipient_id ??
      row.to ??
      row.recipient ??
      row.recipient_role ??
      "admin";

    return {
      id: Number(row.id ?? Math.floor(Math.random() * -1000000)),
      from: String(from),
      to: String(to),
      content: String(row.content ?? ""),
      timestamp: ts,
      read: Boolean(row.read ?? false),
      _raw: row,
    };
  };

  // Find first admin user_id (tries user_roles then profiles fallback)
  const fetchFirstAdminId = async (): Promise<string | null> => {
    try {
      // First try user_roles (preferred)
      const { data: urData, error: urError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1);

      if (!urError && urData && urData.length > 0) {
        const id = urData[0].user_id as string;
        setAdminId(id);
        return id;
      }

      // Fallback: find seeded admin by email in profiles (common in your migration)
      const { data: pData, error: pError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", "lassmarabderraouf@gmail.com")
        .limit(1);

      if (!pError && pData && pData.length > 0) {
        const id = pData[0].id as string;
        setAdminId(id);
        return id;
      }
    } catch (err) {
      console.error("fetchFirstAdminId error", err);
    }
    setAdminId(null);
    return null;
  };

  const loadMessages = async () => {
    if (!mountedRef.current) return;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: true });

      if (!error && data) {
        if (mountedRef.current) {
          setMessages((data as any[]).map(normalize));
          scrollToBottom();
        }
        return;
      }

      // If modern schema columns don't exist, fallback to legacy shape
      if (
        error &&
        (error.code === "42703" || /column .* does not exist/i.test(error.message ?? ""))
      ) {
        const { data: d2, error: err2 } = await supabase
          .from("messages")
          .select("*")
          .or(`from.eq.${user.id},to.eq.${user.id}`)
          .order("sent_at", { ascending: true });

        if (!err2 && d2) {
          if (mountedRef.current) {
            setMessages((d2 as any[]).map(normalize));
            scrollToBottom();
          }
          return;
        }

        console.error("Both messages queries failed", error, err2);
        toast({ title: "Error", description: "Failed to load messages.", variant: "destructive" });
        return;
      }

      if (error) {
        console.error("loadMessages error", error);
        toast({ title: "Error", description: "Failed to load messages.", variant: "destructive" });
      }
    } catch (err) {
      console.error("loadMessages unexpected", err);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    // discover admin ID and then load messages
    (async () => {
      await fetchFirstAdminId();
      await loadMessages();
    })();

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
    setMessage("");

    const optimistic: NormalizedMessage = {
      id: Date.now(),
      from: user.id,
      to: adminId ?? "admin",
      content,
      timestamp: Date.now(),
      read: false,
    };
    setMessages((p) => [...p, optimistic]);
    scrollToBottom();

    try {
      // Ensure we have the admin id; try to fetch if not present
      let toAdmin = adminId;
      if (!toAdmin) {
        toAdmin = await fetchFirstAdminId();
      }

      if (!toAdmin) {
        // If we still don't have an admin, abort in a friendly way
        toast({
          title: "No admin found",
          description: "Can't send message: no admin user found in the database.",
          variant: "destructive",
        });
        // remove optimistic
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setSending(false);
        return;
      }

      // Insert into modern shape with actual admin UUID in recipient_id (satisfies RLS expecting UUID)
      const payloadModern: any = {
        sender_id: user.id,
        recipient_id: toAdmin,
        recipient_role: "admin",
        content,
        created_at: new Date().toISOString(),
        read: false,
      };

      const { data, error } = await supabase.from("messages").insert([payloadModern]).select();

      if (!error && data && data.length > 0) {
        setMessages((prev) => {
          const withoutOpt = prev.filter((m) => m.id !== optimistic.id);
          return [...withoutOpt, normalize(data[0])];
        });
        toast({ title: "Message Sent", description: "Your message has been sent to the admin." });
        setSending(false);
        return;
      }

      // If modern insert fails because the modern columns don't exist, fallback to legacy
      if (
        error &&
        (error.code === "42703" || /column .* does not exist/i.test(error.message ?? ""))
      ) {
        const payloadLegacy = {
          from: user.id,
          to: "admin",
          content,
          sent_at: new Date().toISOString(),
          read: false,
        };
        const { data: d2, error: err2 } = await supabase.from("messages").insert([payloadLegacy]).select();
        if (!err2 && d2 && d2.length > 0) {
          setMessages((prev) => {
            const withoutOpt = prev.filter((m) => m.id !== optimistic.id);
            return [...withoutOpt, normalize(d2[0])];
          });
          toast({ title: "Message Sent", description: "Your message has been sent to the admin." });
          setSending(false);
          return;
        }

        console.error("Send failed for both shapes", error, err2);
        toast({ title: "Send failed", description: "Unable to send message.", variant: "destructive" });
        setSending(false);
        return;
      }

      // If we get here, there was an insert error (likely RLS)
      if (error) {
        console.error("Send error", error);
        // Show helpful message to user & keep optimistic message removed
        toast({
          title: "Send failed",
          description: error.message ?? "Unable to send message",
          variant: "destructive",
        });
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    } catch (err) {
      console.error("Unexpected send error", err);
      toast({ title: "Send failed", description: "Unexpected error.", variant: "destructive" });
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
      // reload so we stay in sync with DB
      loadMessages();
    }
  };

  const markAsRead = async () => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .eq("recipient_id", user.id)
        .eq("read", false);

      if (!error) {
        setMessages((p) => p.map((m) => (m.to === user.id ? { ...m, read: true } : m)));
        return;
      }

      // fallback for legacy column names
      await supabase.from("messages").update({ read: true }).eq("to", user.id).eq("read", false);
      setMessages((p) => p.map((m) => (m.to === user.id ? { ...m, read: true } : m)));
    } catch (err) {
      console.error("markAsRead failed", err);
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
                  <div key={msg.id} className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${isFromMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
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
                if (e.key === "Enter" && !e.shiftKey) {
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

// default export to satisfy both named and default imports
export default MemberChat;

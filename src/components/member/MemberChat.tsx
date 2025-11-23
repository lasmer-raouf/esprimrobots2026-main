// src/components/member/MemberChat.tsx
import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/ui/user-avatar";
import { ChatInput, ChatInputHandle } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatUserList, ChatUser } from "@/components/chat/ChatUserList";

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
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [admins, setAdmins] = useState<ChatUser[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const pollingRef = useRef<number | null>(null);
  const selectionListRef = useRef<HTMLDivElement | null>(null);

  // ref for messages container scrolling
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const currentUserId = user?.id ?? null;
  if (!currentUserId) return null;

  // typing guard: while input focused, defer applying server updates
  const inputFocusedRef = useRef(false);
  const pendingMessagesRef = useRef<NormalizedMessage[] | null>(null);
  const lastMessagesKeyRef = useRef<string>("");

  const chatInputRef = useRef<ChatInputHandle | null>(null);

  const normalize = (row: any): NormalizedMessage => {
    const createdAt = row.created_at ?? row.sent_at ?? null;
    const ts = typeof createdAt === "number" ? createdAt : createdAt ? new Date(createdAt).getTime() : Date.now();
    const from = row.sender_id ?? row.from ?? row.sender ?? "unknown";
    const to = row.recipient_id ?? row.to ?? row.recipient ?? row.recipient_role ?? "admin";
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

  const splitName = (fullName?: string | null) => {
    if (!fullName) return { first: "U", last: "" };
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0] ?? "";
    const last = parts.length > 1 ? parts.slice(-1)[0] : "";
    return { first, last };
  };

  const loadAdmins = useCallback(async () => {
    try {
      const { data: urData, error: urError } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (urError) {
        console.warn("loadAdmins: user_roles error", urError);
      }
      const userIds = (urData || []).map((r: any) => String(r.user_id)).filter(Boolean) ?? [];

      let adminsList: ChatUser[] = [];

      if (userIds.length > 0) {
        const { data: pData, error: pErr } = await supabase
          .from("profiles")
          .select("id, name, email, image")
          .in("id", userIds)
          .order("name", { ascending: true });

        if (!pErr && pData) {
          adminsList = (pData || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            image: p.image ?? null,
          }));
        } else {
          console.warn("loadAdmins: profiles fetch error", pErr);
        }
      } else {
        const { data: pData2, error: pErr2 } = await supabase
          .from("profiles")
          .select("id, name, email, image")
          .eq("email", "lassmarabderraouf@gmail.com")
          .limit(1);

        if (!pErr2 && pData2 && pData2.length > 0) {
          adminsList = [{ id: pData2[0].id, name: pData2[0].name, email: pData2[0].email, image: pData2[0].image ?? null }];
        }
      }

      if (mountedRef.current) {
        setAdmins(adminsList);
        if (!selectedAdminId && adminsList.length > 0) {
          setSelectedAdminId(adminsList[0].id);
        }
      }
    } catch (err) {
      console.error("loadAdmins unexpected", err);
    }
  }, [selectedAdminId]);

  const loadMessages = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
        .order("created_at", { ascending: true });

      if (!error && data) {
        const serverNormalized = (data as any[]).map(normalize);
        const key = serverNormalized.map((m) => `${m.id}:${m.timestamp}`).join("|");
        if (key === lastMessagesKeyRef.current) return;
        lastMessagesKeyRef.current = key;

        if (inputFocusedRef.current) {
          pendingMessagesRef.current = serverNormalized;
          return;
        }
        if (mountedRef.current) setMessages(serverNormalized);
        return;
      }

      if (error && (error.code === "42703" || /column .* does not exist/i.test(error.message ?? ""))) {
        const { data: d2, error: err2 } = await supabase
          .from("messages")
          .select("*")
          .or(`from.eq.${currentUserId},to.eq.${currentUserId}`)
          .order("sent_at", { ascending: true });

        if (!err2 && d2) {
          const serverNormalized = (d2 as any[]).map(normalize);
          const key = serverNormalized.map((m) => `${m.id}:${m.timestamp}`).join("|");
          if (key === lastMessagesKeyRef.current) return;
          lastMessagesKeyRef.current = key;

          if (inputFocusedRef.current) {
            pendingMessagesRef.current = serverNormalized;
            return;
          }
          if (mountedRef.current) setMessages(serverNormalized);
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
  }, [currentUserId, toast]);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      await loadAdmins();
      await loadMessages();
    })();

    pollingRef.current = window.setInterval(loadMessages, 2000);
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadAdmins, loadMessages]);

  // auto-scroll when messages or selectedAdmin changes — but avoid auto-scrolling while input is focused
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (inputFocusedRef.current) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, selectedAdminId]);

  const getUnreadCount = (adminId: string) =>
    messages.filter((m) => m.from === adminId && (m.to === currentUserId || m.to === "admin") && !m.read).length;

  const getAdminMessages = (adminId: string) =>
    messages.filter(
      (m) =>
        (m.from === adminId && (m.to === currentUserId || m.to === "admin")) ||
        ((m.from === currentUserId || m.from === "admin") && m.to === adminId)
    );

  const getLastMessage = (adminId: string) => {
    const list = messages
      .filter((m) => m.from === adminId || m.to === adminId || m.from === currentUserId || m.to === currentUserId)
      .filter(
        (m) =>
          (m.from === adminId && (m.to === currentUserId || m.to === "admin")) ||
          (m.to === adminId && (m.from === currentUserId || m.from === "admin"))
      )
      .sort((a, b) => b.timestamp - a.timestamp);
    return list[0] ?? null;
  };

  const handleSelectAdmin = (adminId: string) => {
    setSelectedAdminId(adminId);
    markAsRead(adminId);
    chatInputRef.current?.focus();
    if (!inputFocusedRef.current && pendingMessagesRef.current) {
      setMessages(pendingMessagesRef.current);
      pendingMessagesRef.current = null;
    }
  };

  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim()) {
        throw new Error("empty");
      }
      setSending(true);
      const toAdminId = selectedAdminId ?? (admins.length > 0 ? admins[0].id : null);

      const optimistic: NormalizedMessage = {
        id: Date.now(),
        from: currentUserId,
        to: toAdminId ?? "admin",
        content: content.trim(),
        timestamp: Date.now(),
        read: false,
      };
      setMessages((p) => [...p, optimistic]);

      try {
        let toAdmin = toAdminId;
        if (!toAdmin) {
          const { data: urData, error: urError } = await supabase.from("user_roles").select("user_id").eq("role", "admin").limit(1);
          if (!urError && urData && urData.length > 0) toAdmin = String(urData[0].user_id);
        }

        if (!toAdmin) {
          toast({
            title: "No admin found",
            description: "Can't send message: no admin user found in the database.",
            variant: "destructive",
          });
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          throw new Error("no admin");
        }

        const payloadModern: any = {
          sender_id: currentUserId,
          recipient_id: toAdmin,
          recipient_role: "admin",
          content: content.trim(),
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
          return;
        }

        if (error && (error.code === "42703" || /column .* does not exist/i.test(error.message ?? ""))) {
          const payloadLegacy = {
            from: currentUserId,
            to: "admin",
            content: content.trim(),
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
            return;
          }
          console.error("Send failed for both shapes", error, err2);
          toast({ title: "Send failed", description: "Unable to send message.", variant: "destructive" });
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          throw new Error("send failed");
        }

        if (error) {
          console.error("Send error", error);
          toast({ title: "Send failed", description: error.message ?? "Unable to send message", variant: "destructive" });
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          throw error;
        }
      } catch (err) {
        throw err;
      } finally {
        setSending(false);
        await loadMessages();
      }
    },
    [selectedAdminId, admins, currentUserId, toast, loadMessages]
  );

  const markAsRead = useCallback(
    async (adminId?: string) => {
      try {
        const admin = adminId ?? selectedAdminId;
        if (!admin) return;
        const { error } = await supabase.from("messages").update({ read: true }).eq("sender_id", admin).eq("recipient_id", currentUserId).eq("read", false);
        if (!error) {
          setMessages((p) => p.map((m) => (m.from === admin && (m.to === currentUserId || m.to === "admin") ? { ...m, read: true } : m)));
          return;
        }
        const { error: err2 } = await supabase.from("messages").update({ read: true }).eq("from", admin).eq("to", currentUserId).eq("read", false);
        if (!err2) setMessages((p) => p.map((m) => (m.from === admin ? { ...m, read: true } : m)));
      } catch (err) {
        console.error("markAsRead failed", err);
      } finally {
        await loadMessages();
      }
    },
    [selectedAdminId, currentUserId, loadMessages]
  );

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

  const selectedAdmin = admins.find((a) => a.id === selectedAdminId);
  const filteredMessages = selectedAdminId ? getAdminMessages(selectedAdminId) : [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Chat with Admins</h1>
          <p className="text-muted-foreground">Send messages to the club administrators</p>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-5">
          <ChatUserList
            title="Admins"
            users={admins}
            selectedUserId={selectedAdminId}
            onSelectUser={handleSelectAdmin}
            getLastMessage={getLastMessage}
            getUnreadCount={getUnreadCount}
          />
        </div>
        {/* MAIN CHAT CARD */}
        <Card className="md:col-span-7 h-[600px] flex flex-col">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{selectedAdmin ? `Chat with ${selectedAdmin.name}` : "Select an admin"}</CardTitle>

          </CardHeader>

          {/* CardContent must be a flex column with min-h-0 to allow proper overflow behavior */}
          <CardContent className="flex-1 flex flex-col min-h-0 relative">
            {selectedAdmin ? (
              <>
                {/* messages container: flex-1 so it consumes available space and scrolls internally */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-6 px-3 py-4" aria-live="polite">
                  {filteredMessages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No messages yet. Start a conversation!</p>
                  ) : (
                    filteredMessages.map((msg) => {
                      const isMe = msg.from === currentUserId;
                      const otherUser = !isMe ? admins.find((a) => a.id === msg.from) : null;
                      const { first, last } = splitName(otherUser?.name);

                      return (
                        <MessageBubble
                          key={`${msg.id}-${msg.timestamp}`}
                          message={msg}
                          isOwnMessage={isMe}
                          avatar={
                            !isMe ? (
                              <UserAvatar
                                firstName={first || 'U'}
                                lastName={last || ''}
                                src={otherUser?.image ?? undefined}
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
                  <ChatInput ref={chatInputRef} onSend={handleSend} disabled={!selectedAdminId} onFocus={handleInputFocus} onBlur={handleInputBlur} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">Select an admin to start chatting</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MemberChat;

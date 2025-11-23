import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/ui/user-avatar';

export type ChatUser = {
    id: string;
    name: string;
    image?: string | null;
    email?: string | null;
};

export type LastMessageInfo = {
    content: string;
    timestamp: number;
};

type ChatUserListProps = {
    title: string;
    users: ChatUser[];
    selectedUserId: string | null;
    onSelectUser: (id: string) => void;
    getLastMessage: (userId: string) => LastMessageInfo | null;
    getUnreadCount: (userId: string) => number;
    height?: string;
};

const UserRow = React.memo(({
    user,
    selected,
    onSelect,
    lastMsg,
    unread
}: {
    user: ChatUser;
    selected: boolean;
    onSelect: (id: string) => void;
    lastMsg: LastMessageInfo | null;
    unread: number;
}) => {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (selected) ref.current?.focus();
    }, [selected]);

    const splitName = (fullName?: string | null) => {
        if (!fullName) return { first: 'U', last: '' };
        const parts = fullName.trim().split(/\s+/);
        const first = parts[0] ?? '';
        const last = parts.length > 1 ? parts.slice(-1)[0] : '';
        return { first, last };
    };

    const { first, last } = splitName(user.name);

    return (
        <div
            role="button"
            tabIndex={0}
            ref={ref}
            data-id={user.id}
            aria-pressed={selected}
            title={user.name}
            onClick={() => onSelect(user.id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(user.id);
                }
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[role="button"]') ?? []);
                    const idx = nodes.findIndex((n) => n.dataset.id === user.id);
                    const next = e.key === 'ArrowDown' ? nodes[idx + 1] : nodes[idx - 1];
                    next?.focus();
                }
            }}
            className={`w-full flex items-start gap-5 px-5 py-4 rounded-lg transition-all outline-none
        ${selected ? 'bg-primary/8 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}
        >
            <UserAvatar firstName={first || 'U'} lastName={last || ''} src={user.image ?? undefined} sizeClass="w-16 h-16" />
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <div className="truncate">
                        <div className={`font-medium ${selected ? 'text-primary' : ''}`}>{user.name}</div>
                        {user.email && <div className="text-sm text-muted-foreground truncate">{user.email}</div>}
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

UserRow.displayName = 'UserRow';

export const ChatUserList = ({
    title,
    users,
    selectedUserId,
    onSelectUser,
    getLastMessage,
    getUnreadCount,
    height = "h-[600px]"
}: ChatUserListProps) => {
    return (
        <Card className={`flex flex-col ${height}`}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
                {users.map((user) => (
                    <UserRow
                        key={user.id}
                        user={user}
                        selected={selectedUserId === user.id}
                        onSelect={onSelectUser}
                        lastMsg={getLastMessage(user.id)}
                        unread={getUnreadCount(user.id)}
                    />
                ))}
                {users.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        No users found.
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

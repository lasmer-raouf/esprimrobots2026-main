import React from 'react';

export type Message = {
    id: number;
    content: string;
    timestamp: number;
    read?: boolean;
};

type MessageBubbleProps = {
    message: Message;
    isOwnMessage: boolean;
    showStatus?: boolean;
    avatar?: React.ReactNode;
};

export const MessageBubble = React.memo(({ message, isOwnMessage, showStatus = true, avatar }: MessageBubbleProps) => {
    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 items-end`}>
            {!isOwnMessage && avatar && (
                <div className="mr-2">
                    {avatar}
                </div>
            )}
            <div
                className={`max-w-[70%] px-4 py-2 rounded-lg ${isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
            >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <div className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                    {isOwnMessage && showStatus && (
                        <span className="ml-2">
                            {message.read ? 'Read' : 'Sent'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});

MessageBubble.displayName = 'MessageBubble';

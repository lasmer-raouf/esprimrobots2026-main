import React, { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Send } from 'lucide-react';

export type ChatInputHandle = {
    focus: () => void;
};

type ChatInputProps = {
    onSend: (content: string) => Promise<void> | void;
    disabled?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
    placeholder?: string;
};

export const ChatInput = React.forwardRef<ChatInputHandle, ChatInputProps>(
    ({ onSend, disabled, onFocus, onBlur, placeholder = "Type your message..." }, ref) => {
        const inputRef = useRef<HTMLInputElement | null>(null);
        const [value, setValue] = useState('');
        const [sending, setSending] = useState(false);

        // preserve selection across re-renders
        const selectionRef = useRef<{ start: number; end: number } | null>(null);
        useLayoutEffect(() => {
            const t = inputRef.current;
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
                    inputRef.current?.focus();
                },
            }),
            []
        );

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setValue(e.target.value);
            selectionRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd };
        };

        const doSend = async () => {
            const trimmed = value.trim();
            if (!trimmed || sending || disabled) return;
            setSending(true);
            try {
                await onSend(trimmed);
                setValue('');
            } catch (err) {
                console.error('ChatInput: send failed', err);
            } finally {
                setSending(false);
            }
        };

        return (
            <div className="px-3 py-3">
                <InputGroup>
                    <InputGroupInput
                        ref={inputRef}
                        value={value}
                        onChange={handleChange}
                        placeholder={placeholder}
                        className="flex-1"
                        onKeyDown={async (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                await doSend();
                            }
                        }}
                        disabled={disabled}
                        onFocus={onFocus}
                        onBlur={onBlur}
                    />
                    <InputGroupButton onClick={doSend} disabled={sending || disabled}>
                        <Send className="h-4 w-4" />
                    </InputGroupButton>
                </InputGroup>
            </div>
        );
    }
);

ChatInput.displayName = 'ChatInput';

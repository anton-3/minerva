// ChatSheet — slide-out chat panel using shadcn Sheet
// Triggered by chat button in BottomControlBar.
// Wraps the existing chat message + input logic.

"use client";

import { useRef, useEffect, useState } from "react";
import type { ConversationMessage } from "@/types/session";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ConversationMessage[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
  onNewMessage?: () => void;
}

export function ChatSheet({
  open,
  onOpenChange,
  messages,
  onSendMessage,
  isProcessing,
  onNewMessage,
}: ChatSheetProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Notify parent of new messages (for unread badge)
  useEffect(() => {
    if (messages.length > prevCountRef.current && !open) {
      onNewMessage?.();
    }
    prevCountRef.current = messages.length;
  }, [messages.length, open, onNewMessage]);

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;
    onSendMessage(trimmed);
    setInput("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={true}
        className="w-[360px] sm:max-w-[360px] flex flex-col p-0"
      >
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <SheetTitle className="text-sm">Chat</SheetTitle>
        </SheetHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-muted-foreground text-xs text-center py-8">
              Start talking or type a message below.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                <span className="text-muted-foreground text-sm animate-pulse">
                  Thinking...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Text input */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-border shrink-0"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={isProcessing}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
            >
              Send
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

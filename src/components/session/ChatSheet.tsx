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
import { ModelPicker } from "./ModelPicker";

interface ImageData {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

interface ChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ConversationMessage[];
  onSendMessage: (text: string, imageData?: ImageData) => void;
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
  const [pendingImage, setPendingImage] = useState<ImageData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if ((!trimmed && !pendingImage) || isProcessing) return;
    onSendMessage(trimmed || "What's in this image?", pendingImage ?? undefined);
    setInput("");
    setPendingImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/png;base64,... → extract base64 and mediaType
      const match = result.match(/^data:(image\/(jpeg|png|gif|webp));base64,(.+)$/);
      if (match) {
        setPendingImage({
          base64: match[3],
          mediaType: match[1] as ImageData["mediaType"],
        });
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={true}
        className="w-[360px] sm:max-w-[360px] flex flex-col p-0"
      >
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle className="text-sm">Chat</SheetTitle>
            <ModelPicker className="w-[150px]" />
          </div>
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
                    ? "bg-brand-primary text-white rounded-br-md"
                    : "bg-neutral-background border border-border-light rounded-bl-md text-text-primary"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-neutral-background border border-border-light rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-brand-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-brand-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Text input */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-border shrink-0"
        >
          {/* Image preview */}
          {pendingImage && (
            <div className="mb-2 relative inline-block">
              <img
                src={`data:${pendingImage.mediaType};base64,${pendingImage.base64}`}
                alt="Upload preview"
                className="h-16 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center"
              >
                x
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-2 py-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
              title="Attach image"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pendingImage ? "Ask about this image..." : "Type a message..."}
              disabled={isProcessing}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isProcessing || (!input.trim() && !pendingImage)}
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

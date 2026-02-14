// Session Page — THE core tutoring experience
// LiveAvatar handles the avatar video call via LiveKit.
// Layout: Avatar (left) + Canvas (center) + Chat (right sidebar)
// Controls bar at top with timer, end session.

"use client";

import { useSession } from "@/hooks/useSession";
import { AvatarPanel } from "@/components/session/AvatarPanel";
import { CanvasPanel } from "@/components/session/CanvasPanel";
import { ChatPanel } from "@/components/session/ChatPanel";
import { SessionControls } from "@/components/session/SessionControls";

export default function SessionPage() {
  const {
    status,
    avatarStatus,
    isProcessing,
    conversationHistory,
    attach,
    startSession,
    endSession,
    handleTextMessage,
    setEditor,
    clearCanvas,
  } = useSession();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Minerva</h1>
          {status === "active" && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Session Active
            </span>
          )}
        </div>
        <SessionControls
          status={status}
          onStart={startSession}
          onEnd={endSession}
          onClearCanvas={clearCanvas}
        />
      </header>

      {/* Main content — grid: avatar | canvas | chat */}
      <main className="flex-1 grid grid-cols-[1fr_1.5fr_320px] gap-4 p-4 overflow-hidden">
        {/* Left column: AI Avatar */}
        <div className="min-h-0">
          <AvatarPanel status={avatarStatus} onAttach={attach} />
        </div>

        {/* Center: Canvas (whiteboard) */}
        <div className="min-h-0">
          <CanvasPanel onEditorReady={setEditor} />
        </div>

        {/* Right: Chat sidebar */}
        <div className="min-h-0">
          <ChatPanel
            messages={conversationHistory}
            onSendMessage={handleTextMessage}
            isProcessing={isProcessing}
          />
        </div>
      </main>
    </div>
  );
}

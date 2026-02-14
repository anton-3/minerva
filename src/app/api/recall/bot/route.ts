// Recall.ai bot creation API route
// POST: create a recording bot for a session
// Owner: Person C (Backend Brain)
// See: specs/001-minerva-mvp/tasks.md (T054)

import { NextResponse } from "next/server";
import { createSessionRecorder } from "@/lib/recall/client";

export async function POST(request: Request) {
  const body = await request.json();
  const { meeting_url, session_id } = body as {
    meeting_url: string;
    session_id: string;
  };

  if (!meeting_url || !session_id) {
    return NextResponse.json(
      { error: "meeting_url and session_id are required" },
      { status: 400 }
    );
  }

  try {
    const recorder = createSessionRecorder();
    const { botId } = await recorder.startRecording(meeting_url, session_id);
    return NextResponse.json({ botId });
  } catch (err) {
    console.error("[api/recall/bot] Error creating bot:", err);
    return NextResponse.json(
      { error: "Failed to create recording bot" },
      { status: 500 }
    );
  }
}

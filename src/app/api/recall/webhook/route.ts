// Recall.ai webhook receiver
// POST: receives real-time transcript events from Recall.ai
// Owner: Person C (Backend Brain)
// See: specs/001-minerva-mvp/tasks.md (T055)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RecallTranscriptEvent {
  event: string;
  data: {
    bot: {
      id: string;
      metadata?: { session_id?: string };
    };
    data: {
      words: { text: string; start_timestamp?: { absolute?: string } }[];
      participant: {
        id: string;
        name: string;
      };
    };
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as RecallTranscriptEvent;

  // Only process transcript.data events
  if (body.event !== "transcript.data") {
    return NextResponse.json({ ok: true });
  }

  const sessionId = body.data?.bot?.metadata?.session_id;
  if (!sessionId) {
    return NextResponse.json({ ok: true });
  }

  const words = body.data?.data?.words ?? [];
  const text = words.map((w) => w.text).join(" ");
  const speaker = body.data?.data?.participant?.name ?? "unknown";
  const timestamp =
    words[0]?.start_timestamp?.absolute ?? new Date().toISOString();

  if (!text.trim()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const supabase = await createClient();
    await supabase.from("transcript_entries").insert({
      session_id: sessionId,
      speaker,
      text: text.trim(),
      timestamp,
    });
  } catch (err) {
    console.error("[api/recall/webhook] Error saving transcript:", err);
  }

  // Always return 200 quickly to avoid Recall.ai retries
  return NextResponse.json({ ok: true });
}

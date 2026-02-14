// Session summary generation API route
// POST: generate AI summary for a completed session using transcript
// Owner: Person C (Backend Brain)
// See: specs/001-minerva-mvp/tasks.md (T058)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTutorBrain } from "@/lib/claude/client";
import type { Database } from "@/types/database";

type SessionSummaryRow =
  Database["public"]["Tables"]["session_summaries"]["Row"];
type TranscriptRow =
  Database["public"]["Tables"]["transcript_entries"]["Row"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { session_id, transcript: inlineTranscript } = body as {
    session_id: string;
    transcript?: { speaker: string; text: string }[];
  };

  if (!session_id) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400 }
    );
  }

  try {
    let transcriptForSummary: { speaker: string; text: string }[];

    if (inlineTranscript && inlineTranscript.length > 0) {
      // Use inline transcript (from in-memory capture) and save to DB
      transcriptForSummary = inlineTranscript;

      // Save transcript entries to Supabase for persistence
      const entries = inlineTranscript.map((t) => ({
        session_id,
        speaker: t.speaker,
        text: t.text,
        timestamp: new Date().toISOString(),
      }));
      await supabase.from("transcript_entries").insert(entries);
    } else {
      // Fetch transcript entries from Supabase (from Recall.ai webhooks)
      const { data: transcriptData, error: transcriptError } = await supabase
        .from("transcript_entries")
        .select("*")
        .eq("session_id", session_id)
        .order("timestamp", { ascending: true });

      if (transcriptError) {
        return NextResponse.json(
          { error: transcriptError.message },
          { status: 500 }
        );
      }

      const transcript = (transcriptData ?? []) as TranscriptRow[];

      if (transcript.length === 0) {
        return NextResponse.json(
          { error: "No transcript entries found for this session" },
          { status: 404 }
        );
      }

      transcriptForSummary = transcript.map((t) => ({
        speaker: t.speaker,
        text: t.text,
      }));
    }

    // Generate summary via Claude
    const brain = createTutorBrain();
    const summary = await brain.generateSummary(transcriptForSummary);

    // Store summary in Supabase
    const { data, error } = await supabase
      .from("session_summaries")
      .insert({
        session_id,
        summary: summary.summary,
        topics_covered: summary.topicsCovered,
        strengths: summary.strengths,
        areas_for_improvement: summary.areasForImprovement,
        engagement_score: summary.engagementScore,
        comprehension_score: summary.comprehensionScore,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as SessionSummaryRow);
  } catch (err) {
    console.error("[api/session/summary] Error generating summary:", err);
    return NextResponse.json(
      { error: "Failed to generate session summary" },
      { status: 500 }
    );
  }
}

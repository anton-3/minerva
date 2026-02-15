// Session summary generation API route
// POST: generate AI summary for a completed session using transcript
// Owner: Person C (Backend Brain)
// See: specs/001-minerva-mvp/tasks.md (T058)

import { NextResponse } from "next/server";
import { db, sessionSummaries, transcriptEntries } from "@/db";
import { eq, asc } from "drizzle-orm";
import { createTutorBrain } from "@/lib/ai/client";

export async function POST(request: Request) {
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

      // Save transcript entries for persistence
      const entries = inlineTranscript.map((t) => ({
        sessionId: session_id,
        speaker: t.speaker,
        text: t.text,
        timestamp: new Date(),
      }));
      await db.insert(transcriptEntries).values(entries);
    } else {
      // Fetch transcript entries from DB (from Recall.ai webhooks)
      const transcript = await db
        .select()
        .from(transcriptEntries)
        .where(eq(transcriptEntries.sessionId, session_id))
        .orderBy(asc(transcriptEntries.timestamp));

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

    // Store summary in DB
    const [data] = await db
      .insert(sessionSummaries)
      .values({
        sessionId: session_id,
        summary: summary.summary,
        topicsCovered: summary.topicsCovered,
        strengths: summary.strengths,
        areasForImprovement: summary.areasForImprovement,
        engagementScore: summary.engagementScore,
        comprehensionScore: summary.comprehensionScore,
      })
      .returning();

    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/session/summary] Error generating summary:", err);
    return NextResponse.json(
      { error: "Failed to generate session summary" },
      { status: 500 }
    );
  }
}

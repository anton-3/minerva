// Session CRUD API route
// POST: create a new session, PATCH: update session (end), GET: list sessions for a child
// Owner: Person C (Backend Brain)
// See: specs/001-minerva-mvp/tasks.md (T037)

import { NextResponse } from "next/server";
import { db, sessions, sessionSummaries } from "@/db";
import { eq, desc } from "drizzle-orm";

export async function POST(request: Request) {
  const body = await request.json();
  const { child_id, learning_plan_id } = body as {
    child_id: string;
    learning_plan_id?: string;
  };

  if (!child_id) {
    return NextResponse.json({ error: "child_id is required" }, { status: 400 });
  }

  try {
    const [newSession] = await db
      .insert(sessions)
      .values({
        childId: child_id,
        learningPlanId: learning_plan_id ?? null,
        status: "active",
        startedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newSession);
  } catch (error) {
    console.error("[api/session] Error creating session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, status, recording_url } = body as {
    id: string;
    status?: string;
    recording_url?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "Session id is required" }, { status: 400 });
  }

  const updates: { status?: string; recordingUrl?: string; endedAt?: Date } = {};
  if (status) updates.status = status;
  if (recording_url) updates.recordingUrl = recording_url;
  if (status === "completed") updates.endedAt = new Date();

  try {
    const [updated] = await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, id))
      .returning();

    // Serialize Date objects to ISO strings for JSON response
    return NextResponse.json(JSON.parse(JSON.stringify(updated, (_, v) =>
      v instanceof Date ? v.toISOString() : v
    )));
  } catch (error) {
    console.error("[api/session] Error updating session:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");

  if (!childId) {
    return NextResponse.json({ error: "child_id query param required" }, { status: 400 });
  }

  try {
    // Use relational query for join with session_summaries
    const data = await db.query.sessions.findMany({
      where: eq(sessions.childId, childId),
      with: {
        summary: true,
      },
      orderBy: [desc(sessions.startedAt)],
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/session] Error fetching sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

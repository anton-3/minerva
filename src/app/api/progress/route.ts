// Progress API route
// GET: progress for a child, POST: upsert mastery score
// Owner: Person C (Backend Brain)
// See: specs/001-minerva-mvp/tasks.md (T038)

import { NextResponse } from "next/server";
import { db, progress } from "@/db";
import { eq, asc } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");

  if (!childId) {
    return NextResponse.json({ error: "child_id query param required" }, { status: 400 });
  }

  try {
    const data = await db
      .select()
      .from(progress)
      .where(eq(progress.childId, childId))
      .orderBy(asc(progress.subject));

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/progress] Error fetching progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { child_id, subject, topic, score } = body as {
    child_id: string;
    subject: string;
    topic: string;
    score: number;
  };

  if (!child_id || !subject || !topic || score === undefined) {
    return NextResponse.json(
      { error: "child_id, subject, topic, and score are required" },
      { status: 400 }
    );
  }

  try {
    // Upsert: update if exists, insert if not
    const [result] = await db
      .insert(progress)
      .values({ childId: child_id, subject, topic, score })
      .onConflictDoUpdate({
        target: [progress.childId, progress.subject, progress.topic],
        set: { score },
      })
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/progress] Error upserting progress:", error);
    return NextResponse.json({ error: "Failed to upsert progress" }, { status: 500 });
  }
}

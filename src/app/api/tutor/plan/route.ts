// Learning plan generation API route
// POST: generate a learning plan via Claude and store in DB
// GET: fetch learning plan(s) for a child
// Owner: Person C (Backend Brain)
// See: specs/001-minerva-mvp/tasks.md (T049)

import { NextResponse } from "next/server";
import { db, learningPlans } from "@/db";
import { eq, asc, and } from "drizzle-orm";
import { createTutorBrain } from "@/lib/ai/client";

export async function POST(request: Request) {
  const body = await request.json();
  const { child_id, subject, goals } = body as {
    child_id: string;
    subject: string;
    goals: string[];
  };

  if (!child_id || !subject || !goals || goals.length === 0) {
    return NextResponse.json(
      { error: "child_id, subject, and goals (non-empty array) are required" },
      { status: 400 }
    );
  }

  try {
    // Generate learning plan via Claude
    const brain = createTutorBrain();
    const plan = await brain.generateLearningPlan(goals, subject);

    // Convert goals to GoalEntry format
    const goalEntries = goals.map((g) => ({
      description: g,
      status: "active" as const,
    }));

    // Convert Claude's topics to CurriculumEntry format
    const curriculum = plan.topics.map((t) => ({
      name: t.name,
      description: t.description,
      prerequisites: t.prerequisites,
    }));

    const [data] = await db
      .insert(learningPlans)
      .values({
        childId: child_id,
        subject: plan.subject,
        goals: goalEntries,
        currentTopic: plan.currentTopic,
        curriculum,
      })
      .returning();

    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/tutor/plan] Error generating plan:", err);
    return NextResponse.json(
      { error: "Failed to generate learning plan" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");
  const subject = searchParams.get("subject");

  if (!childId) {
    return NextResponse.json(
      { error: "child_id query param required" },
      { status: 400 }
    );
  }

  try {
    const whereClause = subject
      ? and(eq(learningPlans.childId, childId), eq(learningPlans.subject, subject))
      : eq(learningPlans.childId, childId);

    const data = await db
      .select()
      .from(learningPlans)
      .where(whereClause)
      .orderBy(asc(learningPlans.subject));

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/tutor/plan] Error fetching plans:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

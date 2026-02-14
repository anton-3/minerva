// Learning plan generation API route
// POST: generate a learning plan via Claude and store in Supabase
// GET: fetch learning plan(s) for a child
// Owner: Person C (Backend Brain)
// See: specs/001-minerva-mvp/tasks.md (T049)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTutorBrain } from "@/lib/claude/client";
import type { Database } from "@/types/database";

type LearningPlan = Database["public"]["Tables"]["learning_plans"]["Row"];

export async function POST(request: Request) {
  const supabase = await createClient();
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

    // Store in Supabase — convert goals to GoalEntry format
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

    const { data, error } = await supabase
      .from("learning_plans")
      .insert({
        child_id,
        subject: plan.subject,
        goals: goalEntries,
        current_topic: plan.currentTopic,
        curriculum,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as LearningPlan);
  } catch (err) {
    console.error("[api/tutor/plan] Error generating plan:", err);
    return NextResponse.json(
      { error: "Failed to generate learning plan" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");
  const subject = searchParams.get("subject");

  if (!childId) {
    return NextResponse.json(
      { error: "child_id query param required" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("learning_plans")
    .select("*")
    .eq("child_id", childId);

  if (subject) {
    query = query.eq("subject", subject);
  }

  const { data, error } = await query.order("subject", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as LearningPlan[]);
}

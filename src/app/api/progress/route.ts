// Progress API route
// GET: progress for a child, POST: upsert mastery score
// Owner: Person C (Backend Brain)
// See: specs/001-minerva-mvp/tasks.md (T038)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");

  if (!childId) {
    return NextResponse.json({ error: "child_id query param required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("progress")
    .select("*")
    .eq("child_id", childId)
    .order("subject", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
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

  // Upsert: update if exists, insert if not
  const { data, error } = await supabase
    .from("progress")
    .upsert(
      { child_id, subject, topic, score },
      { onConflict: "child_id,subject,topic" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

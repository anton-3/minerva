// Session CRUD API route
// POST: create a new session, PATCH: update session (end), GET: list sessions for a child
// Owner: Person C (Backend Brain)
// See: specs/001-minerva-mvp/tasks.md (T037)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { child_id, learning_plan_id } = body as {
    child_id: string;
    learning_plan_id?: string;
  };

  if (!child_id) {
    return NextResponse.json({ error: "child_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      child_id,
      learning_plan_id: learning_plan_id ?? null,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { id, status, recording_url } = body as {
    id: string;
    status?: string;
    recording_url?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "Session id is required" }, { status: 400 });
  }

  const updates: { status?: string; recording_url?: string; ended_at?: string } = {};
  if (status) updates.status = status;
  if (recording_url) updates.recording_url = recording_url;
  if (status === "completed") updates.ended_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");

  if (!childId) {
    return NextResponse.json({ error: "child_id query param required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .select("*, session_summaries(*)")
    .eq("child_id", childId)
    .order("started_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Parent Dashboard — overview with child list, recent sessions, quick stats
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T039)

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Child = Database["public"]["Tables"]["children"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SummaryRow = Database["public"]["Tables"]["session_summaries"]["Row"];

interface SessionWithSummary extends SessionRow {
  session_summaries: SummaryRow | null;
}

export default async function ParentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch children for this parent
  const { data: rawChildren } = await supabase
    .from("children")
    .select("*")
    .eq("parent_id", user?.id ?? "");

  const children = (rawChildren ?? []) as Child[];

  // Fetch recent sessions across all children
  const childIds = children.map((c) => c.id);
  const { data: rawSessions } = childIds.length > 0
    ? await supabase
        .from("sessions")
        .select("*, session_summaries(*)")
        .in("child_id", childIds)
        .order("started_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const recentSessions = (rawSessions ?? []) as SessionWithSummary[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here is an overview of your children&apos;s learning.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Children</p>
          <p className="text-2xl font-bold">{children.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Sessions</p>
          <p className="text-2xl font-bold">{recentSessions.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="text-2xl font-bold">
            {recentSessions.filter((s) => {
              if (!s.started_at) return false;
              const diff = Date.now() - new Date(s.started_at).getTime();
              return diff < 7 * 24 * 60 * 60 * 1000;
            }).length}
          </p>
        </div>
      </div>

      {/* Children */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Children</h2>
          <Link
            href="/parent/children"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Manage
          </Link>
        </div>
        {children.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground text-sm mb-3">
              No children added yet.
            </p>
            <Link
              href="/parent/children"
              className="text-sm font-medium text-primary hover:underline"
            >
              Add your first child
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {children.map((child) => (
              <div
                key={child.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <h3 className="font-semibold">{child.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Age {child.age} · Grade {child.grade}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent sessions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Sessions</h2>
          <Link
            href="/parent/sessions"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sessions yet. Have your child start a session to see results here.
          </p>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-lg border border-border bg-card p-3 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm">
                    {session.started_at
                      ? new Date(session.started_at).toLocaleDateString()
                      : "Unknown date"}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    session.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

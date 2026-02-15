// Parent Dashboard — overview with child list, recent sessions, quick stats
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T039)

import Link from "next/link";
import { db, children, sessions } from "@/db";
import { inArray, desc } from "drizzle-orm";
import type { Session, SessionSummary } from "@/db/types";

interface SessionWithSummary extends Session {
  summary: SessionSummary | null;
}

export default async function ParentDashboard() {
  // Fetch all children (simplified demo - no parent filtering)
  const childrenList = await db.select().from(children);

  // Fetch recent sessions across all children
  const childIds = childrenList.map((c) => c.id);
  let recentSessions: SessionWithSummary[] = [];

  if (childIds.length > 0) {
    recentSessions = await db.query.sessions.findMany({
      where: inArray(sessions.childId, childIds),
      with: {
        summary: true,
      },
      orderBy: [desc(sessions.startedAt)],
      limit: 5,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here is an overview of your children&apos;s learning.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-[#A78BFA]/10 bg-card p-4">
          <p className="text-sm text-muted-foreground">Children</p>
          <p className="text-2xl font-bold text-[#A78BFA]">{childrenList.length}</p>
        </div>
        <div className="rounded-lg border border-[#67E8F9]/10 bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Sessions</p>
          <p className="text-2xl font-bold text-[#67E8F9]">{recentSessions.length}</p>
        </div>
        <div className="rounded-lg border border-[#A78BFA]/10 bg-card p-4">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="text-2xl font-bold text-[#A78BFA]">
            {recentSessions.filter((s) => {
              if (!s.startedAt) return false;
              const diff = Date.now() - new Date(s.startedAt).getTime();
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
        {childrenList.length === 0 ? (
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
            {childrenList.map((child) => (
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
                    {session.startedAt
                      ? new Date(session.startedAt).toLocaleDateString()
                      : "Unknown date"}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    session.status === "completed"
                      ? "bg-[#A78BFA]/10 text-[#A78BFA]"
                      : "bg-white/5 text-white/40"
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

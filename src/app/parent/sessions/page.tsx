// Sessions page — session history with summaries
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T043)

"use client";

import { useState, useEffect } from "react";
import { SessionSummaryCard } from "@/components/parent/SessionSummaryCard";
import type { Child, Session, SessionSummary } from "@/db/types";

interface SessionWithSummary extends Session {
  summary: SessionSummary | null;
}

export default function SessionsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [sessions, setSessions] = useState<SessionWithSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/children");
      if (res.ok) {
        const data = await res.json();
        setChildren(data);
        if (data.length > 0) {
          setSelectedChild(data[0].id);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedChild) return;

    const fetchSessions = async () => {
      const res = await fetch(`/api/session?child_id=${selectedChild}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    };

    fetchSessions();
  }, [selectedChild]);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Session History</h1>
        <p className="text-muted-foreground">
          Review past sessions and AI-generated summaries.
        </p>
      </div>

      {children.length === 0 ? (
        <p className="text-muted-foreground">Add a child first.</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Child:</label>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground">
                No sessions yet for this child.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionSummaryCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

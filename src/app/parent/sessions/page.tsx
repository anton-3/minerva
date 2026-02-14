// Sessions page — session history with summaries
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T043)

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SessionSummaryCard } from "@/components/parent/SessionSummaryCard";
import type { Database } from "@/types/database";

type Child = Database["public"]["Tables"]["children"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SummaryRow = Database["public"]["Tables"]["session_summaries"]["Row"];

interface SessionWithSummary extends SessionRow {
  session_summaries: SummaryRow | null;
}

export default function SessionsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [sessions, setSessions] = useState<SessionWithSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: childrenData } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", user.id);

      const typedChildren = (childrenData as Child[]) ?? [];
      setChildren(typedChildren);
      if (typedChildren.length > 0) {
        setSelectedChild(typedChildren[0].id);
      }
      setLoading(false);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedChild) return;

    const fetchSessions = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*, session_summaries(*)")
        .eq("child_id", selectedChild)
        .order("started_at", { ascending: false });

      setSessions((data as SessionWithSummary[]) ?? []);
    };

    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

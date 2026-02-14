// Progress page — mastery charts by topic
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T042)

"use client";

import { useState, useEffect } from "react";
import { ProgressChart } from "@/components/parent/ProgressChart";
import type { Child, Progress } from "@/db/types";

export default function ProgressPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [progress, setProgress] = useState<Progress[]>([]);
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

    const fetchProgress = async () => {
      const res = await fetch(`/api/progress?child_id=${selectedChild}`);
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      }
    };

    fetchProgress();
  }, [selectedChild]);

  // Group progress by subject
  const subjects = [...new Set(progress.map((p) => p.subject))];

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-muted-foreground">
          Track topic mastery across sessions.
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

          {subjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground">
                No progress data yet. Complete a session to see results.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {subjects.map((subject) => (
                <div key={subject} className="space-y-2">
                  <h2 className="text-lg font-semibold">{subject}</h2>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <ProgressChart data={progress} subject={subject} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

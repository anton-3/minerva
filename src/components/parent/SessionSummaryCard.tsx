// SessionSummaryCard — card showing session summary with scores
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T047)

"use client";

import type { Database } from "@/types/database";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SummaryRow = Database["public"]["Tables"]["session_summaries"]["Row"];

interface SessionWithSummary extends SessionRow {
  session_summaries: SummaryRow | null;
}

interface SessionSummaryCardProps {
  session: SessionWithSummary;
}

function ScoreBadge({ label, score }: { label: string; score: number | null }) {
  if (score === null) return null;
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? "bg-green-100 text-green-800" :
    pct >= 50 ? "bg-yellow-100 text-yellow-800" :
    "bg-red-100 text-red-800";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}: {pct}%
    </span>
  );
}

export function SessionSummaryCard({ session }: SessionSummaryCardProps) {
  const summary = session.session_summaries;
  const startedAt = session.started_at
    ? new Date(session.started_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Unknown";

  const duration =
    session.started_at && session.ended_at
      ? Math.round(
          (new Date(session.ended_at).getTime() -
            new Date(session.started_at).getTime()) /
            60000
        )
      : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{startedAt}</span>
        <div className="flex gap-2">
          {duration !== null && (
            <span className="text-xs text-muted-foreground">
              {duration} min
            </span>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              session.status === "completed"
                ? "bg-green-100 text-green-800"
                : session.status === "active"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {session.status}
          </span>
        </div>
      </div>

      {summary ? (
        <>
          <p className="text-sm">{summary.summary}</p>

          {summary.topics_covered && summary.topics_covered.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {summary.topics_covered.map((topic) => (
                <span
                  key={topic}
                  className="text-xs bg-muted rounded-full px-2 py-0.5"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <ScoreBadge label="Engagement" score={summary.engagement_score} />
            <ScoreBadge label="Comprehension" score={summary.comprehension_score} />
          </div>

          {summary.strengths && summary.strengths.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Strengths:</span>{" "}
              {summary.strengths.join(", ")}
            </div>
          )}

          {summary.areas_for_improvement && summary.areas_for_improvement.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">To improve:</span>{" "}
              {summary.areas_for_improvement.join(", ")}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Summary not yet generated.
        </p>
      )}
    </div>
  );
}

// SessionSummaryCard — collapsible card with summary, scores, strengths, areas to improve
"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  ArrowUpCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Session, SessionSummary } from "@/db/types";

interface SessionWithSummary extends Session {
  summary: SessionSummary | null;
}

interface SessionSummaryCardProps {
  session: SessionWithSummary;
}

export function SessionSummaryCard({ session }: SessionSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const summary = session.summary;

  const startedAt = session.startedAt
    ? new Date(session.startedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Unknown";

  const duration =
    session.startedAt && session.endedAt
      ? Math.round(
          (new Date(session.endedAt).getTime() -
            new Date(session.startedAt).getTime()) /
            60000
        )
      : null;

  const hasExpandableContent =
    summary &&
    ((summary.summary && summary.summary.length > 0) ||
      (summary.topicsCovered && summary.topicsCovered.length > 0) ||
      (summary.strengths && summary.strengths.length > 0) ||
      (summary.areasForImprovement && summary.areasForImprovement.length > 0));

  return (
    <Card
      className={`transition-shadow ${hasExpandableContent ? "cursor-pointer hover:shadow-soft" : ""}`}
      onClick={() => hasExpandableContent && setExpanded(!expanded)}
    >
      <CardContent className="py-4 space-y-3">
        {/* Collapsed Row — always visible */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-primary">
              {startedAt}
            </span>
            {duration !== null && (
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {duration} min
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={session.status === "completed" ? "default" : "secondary"}
              className="text-xs"
            >
              {session.status}
            </Badge>
            {hasExpandableContent && (
              <button
                className="text-text-secondary hover:text-text-primary transition-colors p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Inline score bars — always visible when scores exist */}
        {summary && (summary.engagementScore != null || summary.comprehensionScore != null) && (
          <div className="grid grid-cols-2 gap-4">
            {summary.engagementScore != null && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">Engagement</span>
                  <span className="font-medium text-text-primary">
                    {Math.round(summary.engagementScore * 100)}%
                  </span>
                </div>
                <Progress value={summary.engagementScore * 100} />
              </div>
            )}
            {summary.comprehensionScore != null && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">Comprehension</span>
                  <span className="font-medium text-text-primary">
                    {Math.round(summary.comprehensionScore * 100)}%
                  </span>
                </div>
                <Progress
                  value={summary.comprehensionScore * 100}
                  className="[&>div]:bg-brand-secondary"
                />
              </div>
            )}
          </div>
        )}

        {/* Topic count when collapsed */}
        {!expanded && summary?.topicsCovered && summary.topicsCovered.length > 0 && (
          <p className="text-xs text-text-secondary">
            {summary.topicsCovered.length} topic{summary.topicsCovered.length !== 1 ? "s" : ""} covered
          </p>
        )}

        {/* No summary state */}
        {!summary && (
          <p className="text-xs text-text-secondary italic">
            Summary not yet generated.
          </p>
        )}

        {/* Expanded content */}
        {expanded && summary && (
          <div className="space-y-4 pt-2 border-t border-border-light">
            {/* Summary text */}
            {summary.summary && (
              <p className="text-sm text-text-secondary leading-relaxed">
                {summary.summary}
              </p>
            )}

            {/* Topic badges */}
            {summary.topicsCovered && summary.topicsCovered.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {summary.topicsCovered.map((topic) => (
                  <Badge key={topic} variant="secondary">
                    {topic}
                  </Badge>
                ))}
              </div>
            )}

            {/* Strengths / Areas to Improve */}
            <div className="grid grid-cols-2 gap-6">
              {summary.strengths && summary.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2 text-text-primary">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Strengths
                  </h4>
                  <ul className="space-y-1">
                    {summary.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-text-secondary">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.areasForImprovement && summary.areasForImprovement.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2 text-text-primary">
                    <ArrowUpCircle className="h-4 w-4 text-brand-accent" />
                    To Improve
                  </h4>
                  <ul className="space-y-1">
                    {summary.areasForImprovement.map((a, i) => (
                      <li key={i} className="text-xs text-text-secondary">
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

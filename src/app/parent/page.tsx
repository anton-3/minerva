// Parent Dashboard — overview with stat cards, session spotlight, children, recent sessions
import Link from "next/link";
import { db, children, sessions } from "@/db";
import { inArray, desc } from "drizzle-orm";
import {
  Users,
  MessageSquare,
  Brain,
  CheckCircle2,
  ArrowUpCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Session, SessionSummary } from "@/db/types";

interface SessionWithSummary extends Session {
  summary: SessionSummary | null;
}

export default async function ParentDashboard() {
  const childrenList = await db.select().from(children);
  const childIds = childrenList.map((c) => c.id);

  let recentSessions: SessionWithSummary[] = [];
  if (childIds.length > 0) {
    recentSessions = await db.query.sessions.findMany({
      where: inArray(sessions.childId, childIds),
      with: { summary: true },
      orderBy: [desc(sessions.startedAt)],
      limit: 5,
    });
  }

  // Compute stats
  const completedSessions = recentSessions.filter(
    (s) => s.status === "completed"
  );
  const sessionsWithScores = recentSessions.filter(
    (s) => s.summary?.comprehensionScore != null
  );
  const avgComprehension =
    sessionsWithScores.length > 0
      ? Math.round(
          (sessionsWithScores.reduce(
            (sum, s) => sum + (s.summary?.comprehensionScore ?? 0),
            0
          ) /
            sessionsWithScores.length) *
            100
        )
      : null;

  // Latest session with a summary
  const latestWithSummary = recentSessions.find((s) => s.summary);

  // Map childId → child name
  const childMap = new Map(childrenList.map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Dashboard
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Welcome back. Here&apos;s how your children are doing.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-text-secondary">
              <Users className="h-4 w-4 text-brand-primary" />
              Children
            </CardDescription>
            <CardTitle className="text-3xl font-display text-text-primary">
              {childrenList.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-secondary">Active profiles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-text-secondary">
              <MessageSquare className="h-4 w-4 text-brand-secondary" />
              Sessions
            </CardDescription>
            <CardTitle className="text-3xl font-display text-brand-primary">
              {completedSessions.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-secondary">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-text-secondary">
              <Brain className="h-4 w-4 text-brand-accent" />
              Comprehension
            </CardDescription>
            <CardTitle className="text-3xl font-display text-text-primary">
              {avgComprehension !== null ? `${avgComprehension}%` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-secondary">Average across sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Session Spotlight */}
      {latestWithSummary?.summary && (
        <Card className="border-brand-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-lg">
                  Latest Session
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  {latestWithSummary.startedAt
                    ? new Date(latestWithSummary.startedAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
                      )
                    : "Unknown"}{" "}
                  {childMap.get(latestWithSummary.childId)?.name &&
                    `· ${childMap.get(latestWithSummary.childId)?.name}`}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {latestWithSummary.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              {latestWithSummary.summary.summary}
            </p>

            {/* Score bars */}
            <div className="grid grid-cols-2 gap-6">
              {latestWithSummary.summary.engagementScore != null && (
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-text-secondary">Engagement</span>
                    <span className="font-medium text-text-primary">
                      {Math.round(latestWithSummary.summary.engagementScore * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={latestWithSummary.summary.engagementScore * 100}
                  />
                </div>
              )}
              {latestWithSummary.summary.comprehensionScore != null && (
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-text-secondary">Comprehension</span>
                    <span className="font-medium text-text-primary">
                      {Math.round(latestWithSummary.summary.comprehensionScore * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={latestWithSummary.summary.comprehensionScore * 100}
                    className="[&>div]:bg-brand-secondary"
                  />
                </div>
              )}
            </div>

            {/* Topics */}
            {latestWithSummary.summary.topicsCovered &&
              latestWithSummary.summary.topicsCovered.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {latestWithSummary.summary.topicsCovered.map((topic) => (
                    <Badge key={topic} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}

            {/* Strengths / Areas to Improve */}
            <div className="grid grid-cols-2 gap-6 pt-2">
              {latestWithSummary.summary.strengths &&
                latestWithSummary.summary.strengths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2 text-text-primary">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {latestWithSummary.summary.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-text-secondary">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {latestWithSummary.summary.areasForImprovement &&
                latestWithSummary.summary.areasForImprovement.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2 text-text-primary">
                      <ArrowUpCircle className="h-4 w-4 text-brand-accent" />
                      To Improve
                    </h4>
                    <ul className="space-y-1">
                      {latestWithSummary.summary.areasForImprovement.map(
                        (a, i) => (
                          <li key={i} className="text-xs text-text-secondary">
                            {a}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Children Quick Access */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Your Children
          </h2>
          <Link
            href="/parent/children"
            className="text-sm text-text-secondary hover:text-brand-primary transition-colors flex items-center gap-1"
          >
            Manage <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {childrenList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-text-secondary text-sm mb-3">
                No children added yet.
              </p>
              <Link
                href="/parent/children"
                className="text-sm font-medium text-brand-primary hover:underline"
              >
                Add your first child
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {childrenList.map((child) => {
              return (
                <Link key={child.id} href={`/parent/sessions`}>
                  <Card className="hover:shadow-soft transition-shadow cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-brand-primary/15 text-brand-primary font-semibold text-sm">
                            {child.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-text-primary truncate">
                            {child.name}
                          </p>
                          <p className="text-xs text-text-secondary">
                            Age {child.age} · Grade {child.grade}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Recent Sessions
          </h2>
          <Link
            href="/parent/sessions"
            className="text-sm text-text-secondary hover:text-brand-primary transition-colors flex items-center gap-1"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No sessions yet. Have your child start a session to see results
            here.
          </p>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => {
              const child = childMap.get(session.childId);
              const duration =
                session.startedAt && session.endedAt
                  ? Math.round(
                      (new Date(session.endedAt).getTime() -
                        new Date(session.startedAt).getTime()) /
                        60000
                    )
                  : null;

              return (
                <Card key={session.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-text-secondary">
                        {session.startedAt
                          ? new Date(session.startedAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )
                          : "—"}
                      </div>
                      {child && (
                        <Badge variant="outline" className="text-xs">
                          {child.name}
                        </Badge>
                      )}
                      {duration !== null && (
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {duration} min
                        </span>
                      )}
                    </div>
                    <Badge
                      variant={
                        session.status === "completed" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {session.status}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

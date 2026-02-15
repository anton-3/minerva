// Sessions page — session history with collapsible summary cards
"use client";

import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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
    return <p className="text-text-secondary">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Session History
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Review past sessions and AI-generated summaries.
        </p>
      </div>

      {children.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-text-secondary text-sm">
              Add a child first to see their sessions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-text-primary">
              Child:
            </label>
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sessions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-8 w-8 text-text-secondary/40 mx-auto mb-3" />
                <p className="text-text-secondary text-sm">
                  No sessions yet for this child.
                </p>
              </CardContent>
            </Card>
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

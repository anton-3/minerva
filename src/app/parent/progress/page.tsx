// Progress page — mastery charts by subject with tabs
"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

  const subjects = [...new Set(progress.map((p) => p.subject))];

  if (loading) {
    return <p className="text-text-secondary">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Progress
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Track topic mastery across sessions.
        </p>
      </div>

      {children.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-text-secondary text-sm">
              Add a child first to track progress.
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

          {subjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-8 w-8 text-text-secondary/40 mx-auto mb-3" />
                <p className="text-text-secondary text-sm">
                  No progress data yet. Complete a session to see results.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-4">
                <Tabs defaultValue={subjects[0]}>
                  <TabsList>
                    {subjects.map((subject) => (
                      <TabsTrigger key={subject} value={subject}>
                        {subject}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {subjects.map((subject) => (
                    <TabsContent key={subject} value={subject}>
                      <ProgressChart data={progress} subject={subject} />
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

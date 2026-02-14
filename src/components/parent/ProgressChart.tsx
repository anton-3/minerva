// ProgressChart — recharts bar chart for topic mastery
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T046)
// Must use "use client" — recharts uses browser-only APIs

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Database } from "@/types/database";

type ProgressRecord = Database["public"]["Tables"]["progress"]["Row"];

interface ProgressChartProps {
  data: ProgressRecord[];
  subject?: string;
}

export function ProgressChart({ data, subject }: ProgressChartProps) {
  const filtered = subject ? data.filter((d) => d.subject === subject) : data;

  const chartData = filtered.map((d) => ({
    topic: d.topic,
    mastery: Math.round(d.score * 100),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted/50 rounded-lg">
        <p className="text-muted-foreground text-sm">
          No progress data yet. Complete a session to see results.
        </p>
      </div>
    );
  }

  return (
    <BarChart width={600} height={256} data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
      <XAxis
        dataKey="topic"
        tick={{ fontSize: 12 }}
        className="fill-muted-foreground"
      />
      <YAxis
        domain={[0, 100]}
        tick={{ fontSize: 12 }}
        className="fill-muted-foreground"
        label={{
          value: "Mastery %",
          angle: -90,
          position: "insideLeft",
          style: { fontSize: 12 },
        }}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "8px",
          fontSize: "12px",
        }}
      />
      <Bar
        dataKey="mastery"
        fill="hsl(var(--primary))"
        radius={[4, 4, 0, 0]}
      />
    </BarChart>
  );
}

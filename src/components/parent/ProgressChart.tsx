// ProgressChart — recharts bar chart for topic mastery with measured width
"use client";

import { useRef, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import type { Progress } from "@/db/types";

interface ProgressChartProps {
  data: Progress[];
  subject?: string;
}

export function ProgressChart({ data, subject }: ProgressChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);

  useEffect(() => {
    if (!containerRef.current) return;

    const measure = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const filtered = subject ? data.filter((d) => d.subject === subject) : data;

  const chartData = filtered.map((d) => ({
    topic: d.topic,
    mastery: Math.round(d.score * 100),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-lg">
        <BarChart3 className="h-8 w-8 text-text-secondary/30 mb-2" />
        <p className="text-text-secondary text-sm">
          No progress data yet. Complete a session to see results.
        </p>
      </div>
    );
  }

  const avgMastery = Math.round(
    chartData.reduce((sum, d) => sum + d.mastery, 0) / chartData.length
  );
  const highest = chartData.reduce((best, d) =>
    d.mastery > best.mastery ? d : best
  );
  const lowest = chartData.reduce((worst, d) =>
    d.mastery < worst.mastery ? d : worst
  );

  return (
    <div ref={containerRef} className="space-y-4">
      <BarChart
        width={width}
        height={280}
        data={chartData}
        margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border-light, #e5e7eb)"
          vertical={false}
        />
        <XAxis
          dataKey="topic"
          tick={{ fontSize: 12, fill: "var(--color-text-secondary, #6b7280)" }}
          axisLine={{ stroke: "var(--color-border-light, #e5e7eb)" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: "var(--color-text-secondary, #6b7280)" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-neutral-surface, #fff)",
            border: "1px solid var(--color-border-light, #e5e7eb)",
            borderRadius: "8px",
            fontSize: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
          formatter={(value) => [`${value}%`, "Mastery"]}
        />
        <Bar
          dataKey="mastery"
          fill="var(--color-brand-primary, #6366f1)"
          radius={[6, 6, 0, 0]}
          maxBarSize={48}
        >
          <LabelList
            dataKey="mastery"
            position="top"
            formatter={(v) => `${v}%`}
            style={{
              fontSize: 11,
              fill: "var(--color-text-secondary, #6b7280)",
              fontWeight: 500,
            }}
          />
        </Bar>
      </BarChart>

      {/* Summary row */}
      <div className="flex items-center gap-6 text-xs text-text-secondary pt-2 border-t border-border-light">
        <span>
          Average: <strong className="text-text-primary">{avgMastery}%</strong>
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-green-500" />
          Best: <strong className="text-text-primary">{highest.topic}</strong> ({highest.mastery}%)
        </span>
        {chartData.length > 1 && (
          <span className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-brand-accent" />
            Needs work: <strong className="text-text-primary">{lowest.topic}</strong> ({lowest.mastery}%)
          </span>
        )}
      </div>
    </div>
  );
}

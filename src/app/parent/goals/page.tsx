// Goals page — set learning goals per child per subject
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T041)

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoalForm } from "@/components/parent/GoalForm";
import type { Database, GoalEntry } from "@/types/database";

type Child = Database["public"]["Tables"]["children"]["Row"];
type LearningPlan = Database["public"]["Tables"]["learning_plans"]["Row"];

export default function GoalsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
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

        const childIds = typedChildren.map((c) => c.id);
        const { data: plansData } = await supabase
          .from("learning_plans")
          .select("*")
          .in("child_id", childIds);

        setPlans((plansData as LearningPlan[]) ?? []);
      }

      setLoading(false);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [generating, setGenerating] = useState(false);

  const handleSave = async (data: {
    child_id: string;
    subject: string;
    goals: GoalEntry[];
  }) => {
    setGenerating(true);
    try {
      // Call Claude to generate a structured learning plan + curriculum
      const res = await fetch("/api/tutor/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: data.child_id,
          subject: data.subject,
          goals: data.goals.map((g) => g.description),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("[goals] Plan generation failed:", err);
        return;
      }

      setShowForm(false);
      // Refresh plans from Supabase
      const { data: updated } = await supabase
        .from("learning_plans")
        .select("*")
        .eq("child_id", selectedChild);
      setPlans((updated ?? []) as LearningPlan[]);
    } catch (err) {
      console.error("[goals] Error generating plan:", err);
    } finally {
      setGenerating(false);
    }
  };

  const selectedPlans = plans.filter((p) => p.child_id === selectedChild);
  const selectedChildName = children.find((c) => c.id === selectedChild)?.name;

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Learning Goals</h1>
        <p className="text-muted-foreground">
          Set goals for each child to personalize their learning.
        </p>
      </div>

      {children.length === 0 ? (
        <p className="text-muted-foreground">
          Add a child first before setting goals.
        </p>
      ) : (
        <>
          {/* Child selector */}
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
            <button
              onClick={() => setShowForm(!showForm)}
              className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {showForm ? "Cancel" : "Add Goals"}
            </button>
          </div>

          {showForm && (
            <div className="rounded-lg border border-border bg-card p-4">
              {generating ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground">
                    Generating learning plan with AI...
                  </span>
                </div>
              ) : (
                <GoalForm childId={selectedChild} onSave={handleSave} />
              )}
            </div>
          )}

          {/* Existing plans */}
          {selectedPlans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground">
                No goals set for {selectedChildName} yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border border-border bg-card p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{plan.subject}</h3>
                    {plan.current_topic && (
                      <span className="text-xs bg-muted rounded-full px-2 py-0.5">
                        Current: {plan.current_topic}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {plan.goals.map((goal, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            goal.status === "completed"
                              ? "bg-green-500"
                              : goal.status === "paused"
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                          }`}
                        />
                        {goal.description}
                      </li>
                    ))}
                  </ul>
                  {plan.curriculum && plan.curriculum.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        AI-generated curriculum:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {plan.curriculum.map((topic, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              topic.name === plan.current_topic
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {topic.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

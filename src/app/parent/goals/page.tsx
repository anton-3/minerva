// Goals page — set learning goals per child per subject
"use client";

import { useState, useEffect } from "react";
import { Target, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoalForm } from "@/components/parent/GoalForm";
import type { Child, LearningPlan, GoalEntry } from "@/db/types";

export default function GoalsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/children");
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const childrenData = await res.json();
      setChildren(childrenData);

      if (childrenData.length > 0) {
        setSelectedChild(childrenData[0].id);

        const childIds = childrenData.map((c: Child) => c.id).join(",");
        const plansRes = await fetch(`/api/learning-plans?child_ids=${childIds}`);
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPlans(plansData);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleSave = async (data: {
    child_id: string;
    subject: string;
    goals: GoalEntry[];
  }) => {
    setGenerating(true);
    try {
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
      const plansRes = await fetch(`/api/tutor/plan?child_id=${selectedChild}`);
      if (plansRes.ok) {
        setPlans(await plansRes.json());
      }
    } catch (err) {
      console.error("[goals] Error generating plan:", err);
    } finally {
      setGenerating(false);
    }
  };

  const selectedPlans = plans.filter((p) => p.childId === selectedChild);
  const selectedChildName = children.find((c) => c.id === selectedChild)?.name;

  if (loading) {
    return <p className="text-text-secondary">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Learning Goals
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Set goals for each child to personalize their learning.
        </p>
      </div>

      {children.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-text-secondary text-sm">
              Add a child first before setting goals.
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
            <Button
              variant={showForm ? "outline" : "default"}
              onClick={() => setShowForm(!showForm)}
              className="ml-auto"
            >
              <Target className="h-4 w-4 mr-1.5" />
              {showForm ? "Cancel" : "Add Goals"}
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardContent className="py-4">
                {generating ? (
                  <div className="flex items-center gap-2 py-6 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                    <span className="text-sm text-text-secondary">
                      Generating learning plan with AI...
                    </span>
                  </div>
                ) : (
                  <GoalForm childId={selectedChild} onSave={handleSave} />
                )}
              </CardContent>
            </Card>
          )}

          {selectedPlans.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Target className="h-8 w-8 text-text-secondary/40 mx-auto mb-3" />
                <p className="text-text-secondary text-sm">
                  No goals set for {selectedChildName} yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {selectedPlans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-base flex items-center gap-2">
                        <Target className="h-4 w-4 text-brand-primary" />
                        {plan.subject}
                      </CardTitle>
                      {plan.currentTopic && (
                        <Badge variant="secondary" className="text-xs">
                          Current: {plan.currentTopic}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1.5">
                      {plan.goals.map((goal, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              goal.status === "completed"
                                ? "bg-green-500"
                                : goal.status === "paused"
                                ? "bg-yellow-500"
                                : "bg-brand-primary"
                            }`}
                          />
                          <span className="text-text-primary">{goal.description}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.curriculum && plan.curriculum.length > 0 && (
                      <div className="pt-2 border-t border-border-light">
                        <p className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          AI-generated curriculum
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.curriculum.map((topic, i) => (
                            <Badge
                              key={i}
                              variant={
                                topic.name === plan.currentTopic
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {topic.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

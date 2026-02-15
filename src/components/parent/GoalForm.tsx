// GoalForm — form to create/edit learning goals with shadcn components
"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GoalEntry } from "@/db/types";

interface GoalFormProps {
  childId: string;
  subject?: string;
  existingGoals?: GoalEntry[];
  onSave: (data: {
    child_id: string;
    subject: string;
    goals: GoalEntry[];
  }) => void;
}

export function GoalForm({
  childId,
  subject: initialSubject = "",
  existingGoals = [],
  onSave,
}: GoalFormProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [goals, setGoals] = useState<GoalEntry[]>(
    existingGoals.length > 0
      ? existingGoals
      : [{ description: "", status: "active" as const }]
  );

  const addGoal = () => {
    setGoals([...goals, { description: "", status: "active" as const }]);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, description: string) => {
    const updated = [...goals];
    updated[index] = { ...updated[index], description };
    setGoals(updated);
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const validGoals = goals.filter((g) => g.description.trim());
    if (!subject.trim() || validGoals.length === 0) return;
    onSave({ child_id: childId, subject: subject.trim(), goals: validGoals });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g., Algebra, Physics, Writing"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Learning Goals</Label>
        {goals.map((goal, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={goal.description}
              onChange={(e) => updateGoal(i, e.target.value)}
              placeholder="e.g., Master solving linear equations"
            />
            {goals.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeGoal(i)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addGoal}
          className="text-text-secondary"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add goal
        </Button>
      </div>

      <Button type="submit">Save Goals</Button>
    </form>
  );
}

// GoalForm — form to create/edit learning goals
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T045)

"use client";

import { useState } from "react";
import type { GoalEntry } from "@/types/database";

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
        <label htmlFor="subject" className="text-sm font-medium">
          Subject
        </label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g., Algebra, Physics, Writing"
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Learning Goals</label>
        {goals.map((goal, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={goal.description}
              onChange={(e) => updateGoal(i, e.target.value)}
              placeholder="e.g., Master solving linear equations"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {goals.length > 1 && (
              <button
                type="button"
                onClick={() => removeGoal(i)}
                className="text-muted-foreground hover:text-foreground px-2"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addGoal}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          + Add goal
        </button>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Save Goals
      </button>
    </form>
  );
}

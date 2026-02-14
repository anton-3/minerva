// ChildCard — child profile card with name, age, grade, PIN
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T044)

"use client";

import type { Child } from "@/db/types";

interface ChildCardProps {
  child: Child;
  onEdit?: (child: Child) => void;
}

export function ChildCard({ child, onEdit }: ChildCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{child.name}</h3>
        {onEdit && (
          <button
            onClick={() => onEdit(child)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Edit
          </button>
        )}
      </div>
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Age: {child.age}</span>
        <span>Grade: {child.grade}</span>
        <span>PIN: {child.pin}</span>
      </div>
    </div>
  );
}

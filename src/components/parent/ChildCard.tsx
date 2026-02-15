// ChildCard — child profile card with avatar, name, grade, PIN badge
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Child } from "@/db/types";

interface ChildCardProps {
  child: Child;
}

export function ChildCard({ child }: ChildCardProps) {
  const initials = child.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="hover:shadow-soft transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-brand-primary/15 text-brand-primary font-semibold text-base">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary">{child.name}</p>
            <p className="text-sm text-text-secondary">
              Age {child.age} · Grade {child.grade}
            </p>
          </div>

          <Badge variant="outline" className="text-xs font-mono">
            PIN: {child.pin}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

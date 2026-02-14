// Student Home — entry point for students
// Shows "Start Session" button and active learning plan if available.
// Owner: Person A (Session Architect)
// See: specs/001-minerva-mvp/tasks.md (T034)

"use client";

import Link from "next/link";

export default function StudentHome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Minerva
          </h1>
          <p className="text-muted-foreground">
            Your AI tutor is ready to help you learn. Start a session to begin!
          </p>
        </div>

        <Link
          href="/student/session"
          className="inline-flex items-center justify-center w-full rounded-lg bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Start Session
        </Link>

        <p className="text-xs text-muted-foreground">
          Sessions are powered by AI. Your tutor adapts to your learning style.
        </p>
      </div>
    </div>
  );
}

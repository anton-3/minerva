// Login page — email/password for parents, PIN entry for students
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T035)

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LoginMode = "parent" | "student";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("parent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleParentLogin = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/parent");
  };

  const handleParentSignup = async () => {
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/parent");
  };

  const handleStudentLogin = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");

    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    // For hackathon: navigate to student page with PIN in query
    // In production, this would validate against the children table
    router.push(`/student?pin=${pin}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Minerva</h1>
          <p className="text-muted-foreground text-sm">
            AI-powered tutoring for every child
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setMode("parent")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "parent"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            Parent
          </button>
          <button
            onClick={() => setMode("student")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "student"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            Student
          </button>
        </div>

        {/* Parent login form */}
        {mode === "parent" && (
          <form onSubmit={handleParentLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="parent@example.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Min 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <button
              type="button"
              onClick={handleParentSignup}
              disabled={loading}
              className="w-full rounded-lg border border-input py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Create Account
            </button>
          </form>
        )}

        {/* Student PIN entry */}
        {mode === "student" && (
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="pin" className="text-sm font-medium">
                Enter your PIN
              </label>
              <input
                id="pin"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-input bg-background px-3 py-4 text-center text-2xl font-mono tracking-[0.5em] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="0000"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Enter
            </button>
          </form>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}

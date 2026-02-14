// Parent layout — sidebar nav with auth guard
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T036)

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const navItems = [
  { href: "/parent", label: "Dashboard" },
  { href: "/parent/children", label: "Children" },
  { href: "/parent/goals", label: "Goals" },
  { href: "/parent/progress", label: "Progress" },
  { href: "/parent/sessions", label: "Sessions" },
];

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth guard — redirect to login if not authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-muted/30 p-4 flex flex-col gap-1">
        <Link href="/parent" className="text-lg font-bold mb-6 px-3">
          Minerva
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground text-left"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

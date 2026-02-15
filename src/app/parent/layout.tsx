// Parent layout — sidebar nav (demo mode - no auth)
// Owner: Person D (Dashboard + Design)
// See: specs/001-minerva-mvp/tasks.md (T036)

import Link from "next/link";

const navItems = [
  { href: "/parent", label: "Dashboard" },
  { href: "/parent/children", label: "Children" },
  { href: "/parent/goals", label: "Goals" },
  { href: "/parent/progress", label: "Progress" },
  { href: "/parent/sessions", label: "Sessions" },
];

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r border-[#A78BFA]/10 bg-[#0E0C18] p-4 flex flex-col gap-1">
        <Link href="/parent" className="font-display text-lg font-bold mb-6 px-3 text-[#A78BFA]">
          Minerva
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-[#A78BFA]/10 hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-3 py-2 text-xs text-muted-foreground">
          Demo Mode
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

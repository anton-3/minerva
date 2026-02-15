// Parent layout — sidebar nav with active states and icons
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parent/children", label: "Children", icon: Users },
  { href: "/parent/goals", label: "Goals", icon: Target },
  { href: "/parent/progress", label: "Progress", icon: TrendingUp },
  { href: "/parent/sessions", label: "Sessions", icon: MessageSquare },
];

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-neutral-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border-light bg-neutral-surface p-4 flex flex-col">
        {/* Brand */}
        <Link href="/parent" className="flex items-center gap-2.5 px-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-brand-primary/15 flex items-center justify-center">
            <span className="text-brand-primary font-bold text-sm">M</span>
          </div>
          <span className="font-display text-lg font-bold text-text-primary">
            Minerva
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/parent"
                ? pathname === "/parent"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-primary/10 text-brand-primary font-semibold"
                    : "text-text-secondary hover:bg-brand-primary/5 hover:text-brand-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto px-3 pt-4">
          <Badge variant="secondary" className="text-xs">
            Demo Mode
          </Badge>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

// Header — shared navigation header
// Owner: Person D (Dashboard + Design)

import Link from "next/link";

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="font-bold text-lg">
          Minerva
        </Link>
        <nav className="ml-auto flex items-center gap-4">
          {/* TODO: Add auth-aware navigation in Phase 4 (T036) */}
        </nav>
      </div>
    </header>
  );
}

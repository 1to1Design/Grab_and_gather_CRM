"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A fixed bottom bar with five oversized targets. Bottom placement is
 * deliberate: it is reachable one-handed on a phone held low, which is how it
 * will actually be used.
 */
const TABS = [
  { href: "/", label: "Today", icon: "＋" },
  { href: "/meds", label: "Meds", icon: "💊" },
  { href: "/history", label: "History", icon: "🗓" },
  { href: "/insights", label: "Patterns", icon: "📈" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
      <ul
        className="mx-auto flex max-w-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium transition ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <span aria-hidden className="text-xl leading-none">
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

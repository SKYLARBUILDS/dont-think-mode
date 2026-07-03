"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

function Icon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.1 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

// Paths drawn symmetric around x=12 so every glyph reads optically centered.
const ITEMS = [
  { href: "/pro", label: "今天", d: "M4 11l8-7 8 7M6.5 9.5V19h11V9.5" },
  { href: "/pro/plan", label: "计划", d: "M6 8.5h12M6 12h12M6 15.5h12" },
  { href: "/pro/focus", label: "专注", d: "M12 21a9 9 0 110-18 9 9 0 010 18zM12 7.5V12l3 1.8" },
  { href: "/pro/review", label: "回顾", d: "M7 18v-4M12 18v-9M17 18v-6" },
];

export default function ProNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-md px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="lux-glass flex items-stretch justify-between gap-1 rounded-[26px] px-2 py-1.5 shadow-[var(--lux-shadow)]">
          {ITEMS.map((it) => {
            const active =
              it.href === "/pro" ? path === "/pro" : path.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2"
              >
                {active && (
                  <motion.span
                    layoutId="pro-nav-pill"
                    className="absolute inset-0 rounded-2xl bg-black/[0.045]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span
                  className={`relative z-10 transition-colors ${
                    active ? "text-lux-text" : "text-lux-faint"
                  }`}
                >
                  <Icon d={it.d} active={active} />
                </span>
                <span
                  className={`relative z-10 text-[10px] tracking-wide transition-colors ${
                    active ? "text-lux-text" : "text-lux-faint"
                  }`}
                >
                  {it.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

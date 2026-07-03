"use client";

import Link from "next/link";
import { useLife } from "@/lib/store";
import { resolveSchedule } from "@/lib/schedule";
import { fmtClock } from "@/lib/time";
import Reveal from "./Reveal";

/** The day as a vertical journey of glass modules, each block a clean card. */
export default function JourneyTimeline({
  min,
  shift = 0,
}: {
  min: number;
  shift?: number;
}) {
  const schedule = useLife((s) => s.schedule);
  const completed = useLife((s) => s.today.completedBlocks);
  const sorted = [...schedule].sort((a, b) => a.start - b.start);
  const state = resolveSchedule(schedule, min - shift);
  const nowId = state.now?.id ?? null;

  return (
    <div className="relative">
      {/* spine — its center sits at x = 16px, exactly under every node dot */}
      <div
        className="pointer-events-none absolute bottom-5 left-[15px] top-5 w-[2px] rounded-full"
        style={{
          background:
            "linear-gradient(to bottom, rgb(var(--lux-violet) / 0.5), rgb(var(--lux-sage) / 0.45), rgb(var(--lux-line)))",
        }}
      />
      <ul className="space-y-2.5">
        {sorted.map((b, i) => {
          const done = completed.includes(b.id);
          const isNow = b.id === nowId;
          const past = !isNow && b.end <= min - shift;
          // One calm palette: green for every block, blue only for "now".
          const accent = isNow
            ? "rgb(var(--lux-cyan))"
            : "rgb(var(--lux-sage))";
          const isWork = !!b.pomodoro;

          const node = (
            <li
              className={`relative flex items-center pl-9 ${
                past && !done ? "opacity-50" : ""
              }`}
            >
              {/* node dot — centered on the spine at x = 16px */}
              <span className="absolute left-4 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                {isNow ? (
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <span
                      className="absolute h-7 w-7 animate-glow rounded-full"
                      style={{ background: accent, opacity: 0.28 }}
                    />
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ background: accent, boxShadow: `0 0 10px 1px ${accent}` }}
                    />
                  </span>
                ) : done ? (
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: accent }}
                  >
                    ✓
                  </span>
                ) : (
                  <span
                    className="h-3.5 w-3.5 rounded-full border-[2.5px] bg-white"
                    style={{ borderColor: accent }}
                  />
                )}
              </span>

              {/* glass card */}
              <div
                className="flex flex-1 items-center justify-between gap-3 rounded-[20px] border border-white/70 px-4 py-3 backdrop-blur-xl"
                style={{
                  background: isNow
                    ? "rgba(255,255,255,0.88)"
                    : "rgba(255,255,255,0.62)",
                  boxShadow: isNow
                    ? `0 0 0 1.5px ${accent}, 0 14px 30px -16px ${accent}`
                    : "0 10px 24px -16px rgba(96,78,168,0.35)",
                }}
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-[15px] font-semibold ${
                      isNow ? "text-lux-text" : "text-lux-dim"
                    } ${done ? "line-through" : ""}`}
                  >
                    {b.title}
                  </p>
                  <p className="numeric mt-0.5 text-[11px] text-lux-faint">
                    {fmtClock(b.start)} – {fmtClock(b.end === 1440 ? 0 : b.end)}
                    {isNow && (
                      <span className="ml-1.5 font-bold" style={{ color: accent }}>
                        · 现在
                      </span>
                    )}
                  </p>
                </div>
                {done ? (
                  <span className="shrink-0 text-sm" style={{ color: accent }}>
                    ✓
                  </span>
                ) : isWork ? (
                  <span
                    className="shrink-0 text-[11px] font-semibold"
                    style={{ color: accent }}
                  >
                    专注 →
                  </span>
                ) : null}
              </div>
            </li>
          );

          return (
            <Reveal key={b.id} delay={Math.min(i * 0.03, 0.25)}>
              {isWork ? (
                <Link href="/pro/focus" className="block">
                  {node}
                </Link>
              ) : (
                node
              )}
            </Reveal>
          );
        })}
      </ul>
    </div>
  );
}

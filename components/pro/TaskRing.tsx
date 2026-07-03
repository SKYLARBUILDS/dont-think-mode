"use client";

/** Tiny per-task progress ring: donePomodoros / planned. */
export default function TaskRing({
  done,
  total,
  size = 36,
  stroke = 3.5,
}: {
  done: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const p = total > 0 ? Math.min(1, done / total) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const complete = total > 0 && done >= total;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--lux-line))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={complete ? "rgb(var(--lux-sage))" : "rgb(var(--lux-amber))"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="numeric absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-lux-dim">
        {complete ? "✓" : done}
      </span>
    </div>
  );
}

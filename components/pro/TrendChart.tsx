"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

export interface TrendPoint {
  label: string;
  value: number;
}

/** Bespoke animated line + area chart. Draws on mount. */
export default function TrendChart({
  points,
  height = 150,
  max,
}: {
  points: TrendPoint[];
  height?: number;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[:]/g, "");
  const W = 320;
  const H = height;
  const padX = 10;
  const padTop = 14;
  const padBottom = 22;
  const n = points.length;
  const maxV = Math.max(1, max ?? Math.max(...points.map((p) => p.value), 0));
  const x = (i: number) =>
    n <= 1 ? W / 2 : padX + (i / (n - 1)) * (W - 2 * padX);
  const y = (v: number) =>
    H - padBottom - (v / maxV) * (H - padTop - padBottom);

  if (n === 0) return null;

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${H - padBottom} L${x(0).toFixed(
    1
  )},${H - padBottom} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`tc-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--lux-violet))" stopOpacity="0.32" />
          <stop offset="100%" stopColor="rgb(var(--lux-violet))" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`tl-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(var(--lux-cyan))" />
          <stop offset="100%" stopColor="rgb(var(--lux-violet))" />
        </linearGradient>
      </defs>
      {n > 1 && <path d={area} fill={`url(#tc-${uid})`} />}
      <motion.path
        d={line}
        fill="none"
        stroke={`url(#tl-${uid})`}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 1.1, ease: "easeInOut" }}
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.value)}
          r={2.8}
          fill="rgb(var(--lux-bg))"
          stroke="rgb(var(--lux-violet))"
          strokeWidth={2}
        />
      ))}
      {points.map((p, i) => (
        <text
          key={`l-${i}`}
          x={x(i)}
          y={H - 6}
          textAnchor="middle"
          fontSize="9"
          fill="rgb(var(--lux-faint))"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

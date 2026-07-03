"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

interface Props {
  progress: number; // 0–1
  size?: number;
  stroke?: number;
  from?: string;
  to?: string;
  track?: string;
  glow?: boolean;
  ticks?: number; // segment ticks drawn in bg color (milestone look)
  children?: React.ReactNode;
  layoutId?: string;
  className?: string;
}

/** A gradient-stroked progress ring with optional glow + milestone ticks. */
export default function PremiumRing({
  progress,
  size = 260,
  stroke = 14,
  from = "rgb(var(--lux-amber))",
  to = "rgb(var(--lux-rose))",
  track,
  glow = true,
  ticks = 0,
  children,
  layoutId,
  className = "",
}: Props) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[:]/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));

  return (
    <motion.div
      layoutId={layoutId}
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          <linearGradient id={`g-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track ?? "rgb(var(--lux-line))"}
          strokeWidth={stroke}
          opacity={0.5}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#g-${uid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - p) }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          filter={glow ? `url(#glow-${uid})` : undefined}
        />
        {ticks > 0 &&
          Array.from({ length: ticks }).map((_, i) => {
            const a = (i / ticks) * 2 * Math.PI;
            return (
              <line
                key={i}
                x1={size / 2 + (r - stroke / 2) * Math.cos(a)}
                y1={size / 2 + (r - stroke / 2) * Math.sin(a)}
                x2={size / 2 + (r + stroke / 2) * Math.cos(a)}
                y2={size / 2 + (r + stroke / 2) * Math.sin(a)}
                stroke="rgb(var(--lux-bg))"
                strokeWidth={2.5}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </motion.div>
  );
}

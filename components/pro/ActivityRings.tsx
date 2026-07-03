"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

export interface RingDef {
  value: number; // 0–1
  from: string;
  to: string;
}

/** Apple-Watch-style concentric activity rings. */
export default function ActivityRings({
  rings,
  size = 220,
  stroke = 15,
  gap = 6,
  children,
}: {
  rings: RingDef[];
  size?: number;
  stroke?: number;
  gap?: number;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[:]/g, "");
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          {rings.map((ring, i) => (
            <linearGradient
              key={i}
              id={`ar-${uid}-${i}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={ring.from} />
              <stop offset="100%" stopColor={ring.to} />
            </linearGradient>
          ))}
        </defs>
        {rings.map((ring, i) => {
          const r = (size - stroke) / 2 - i * (stroke + gap);
          if (r <= stroke) return null;
          const c = 2 * Math.PI * r;
          const p = Math.min(1, Math.max(0, ring.value));
          return (
            <g key={i}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="rgb(var(--lux-line))"
                strokeWidth={stroke}
                opacity={0.4}
              />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={`url(#ar-${uid}-${i})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                initial={reduce ? false : { strokeDashoffset: c }}
                animate={{ strokeDashoffset: c * (1 - p) }}
                transition={{
                  duration: reduce ? 0 : 1,
                  delay: i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </g>
          );
        })}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

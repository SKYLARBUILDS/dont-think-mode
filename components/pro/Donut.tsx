"use client";

import PremiumRing from "./PremiumRing";

/** A small completion donut (no glow), with a centered label. */
export default function Donut({
  value,
  size = 132,
  stroke = 13,
  from = "rgb(var(--lux-sage))",
  to = "rgb(var(--lux-cyan))",
  children,
}: {
  value: number; // 0–1
  size?: number;
  stroke?: number;
  from?: string;
  to?: string;
  children?: React.ReactNode;
}) {
  return (
    <PremiumRing
      progress={value}
      size={size}
      stroke={stroke}
      from={from}
      to={to}
      glow={false}
    >
      {children}
    </PremiumRing>
  );
}

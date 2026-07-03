"use client";

import { motion } from "framer-motion";

const COLORS = ["--lux-amber", "--lux-sage", "--lux-rose", "--lux-violet", "--lux-cyan"];

/** A short celebratory burst. Mount it (keyed) to replay; unmount after ~1s. */
export default function Confetti({ count = 16 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-visible">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 56 + (i % 4) * 20;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              opacity: 0,
              scale: 0.4,
              rotate: (i % 2 ? 1 : -1) * 200,
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute h-2 w-2 rounded-[2px]"
            style={{ background: `rgb(var(${COLORS[i % COLORS.length]}))` }}
          />
        );
      })}
    </div>
  );
}

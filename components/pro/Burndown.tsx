"use client";

import { motion } from "framer-motion";

/** Pomodoro set progress as growing pill-dots. `active` is the in-progress one. */
export default function Burndown({
  total,
  done,
  active,
}: {
  total: number;
  done: number;
  active?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < done;
        const isActive = i === active;
        return (
          <motion.span
            key={i}
            initial={false}
            animate={{ width: filled || isActive ? 24 : 10, scale: isActive ? 1.12 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`h-2.5 rounded-full ${
              filled ? "bg-lux-sage" : isActive ? "bg-lux-amber" : "bg-lux-line"
            }`}
          />
        );
      })}
    </div>
  );
}

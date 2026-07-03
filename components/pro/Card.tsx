"use client";

import { motion } from "framer-motion";

type CardProps = React.ComponentProps<typeof motion.div> & {
  /** Lift the card with a soft shadow + hover float. */
  interactive?: boolean;
};

/** A frosted-glass surface — the premium tree's default container. */
export default function Card({
  className = "",
  interactive = false,
  children,
  ...rest
}: CardProps) {
  return (
    <motion.div
      className={`rounded-[26px] border border-lux-line/70 bg-lux-card/70 p-5 shadow-[var(--lux-shadow)] backdrop-blur-xl ${
        interactive ? "transition-transform active:scale-[0.98]" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

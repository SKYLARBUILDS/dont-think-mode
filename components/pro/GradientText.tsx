"use client";

/** Text painted with a premium gradient. */
export default function GradientText({
  children,
  gradient = "var(--grad-violet)",
  className = "",
}: {
  children: React.ReactNode;
  gradient?: string;
  className?: string;
}) {
  return (
    <span
      className={`bg-clip-text text-transparent ${className}`}
      style={{ backgroundImage: gradient }}
    >
      {children}
    </span>
  );
}

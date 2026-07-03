"use client";

/** A small glass stat tile: big number + caption. */
export default function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "amber" | "sage" | "violet";
}) {
  const tone =
    accent === "amber"
      ? "text-lux-amber"
      : accent === "sage"
      ? "text-lux-sage"
      : accent === "violet"
      ? "text-lux-violet"
      : "text-lux-text";
  return (
    <div className="rounded-2xl border border-lux-line/70 bg-lux-card/60 px-3 py-3 text-center backdrop-blur-md">
      <p className={`numeric text-2xl font-semibold tracking-tight ${tone}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] tracking-wide text-lux-faint">{label}</p>
    </div>
  );
}

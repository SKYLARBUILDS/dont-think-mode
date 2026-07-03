import ProNav from "@/components/pro/ProNav";

// Nested layout for the premium tree. It mounts NO engine singletons — those
// live once in the ROOT layout (app/layout.tsx) and serve both trees, so the
// pomodoro timer, cloud sync, reminders, etc. never double-run. This only adds
// the premium chrome: the .pro token scope, the aurora background, and the nav.
export default function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pro relative -mx-5 min-h-dvh px-5 text-lux-text">
      {/* Clean, near-black editorial base with a single restrained top glow —
          no busy ambient motion. Content is lifted above via a z-10 wrapper. */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "rgb(var(--lux-bg))", zIndex: 0 }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "var(--grad-aurora)", zIndex: 1 }}
      />
      <div className="relative z-10">{children}</div>
      <ProNav />
    </div>
  );
}

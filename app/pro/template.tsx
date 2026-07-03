"use client";

import PageTransition from "@/components/pro/PageTransition";

// A template (not a layout) remounts on every navigation — that's what lets
// AnimatePresence play the per-route enter/exit transitions.
export default function ProTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}

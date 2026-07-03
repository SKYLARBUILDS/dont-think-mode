"use client";

import { useState } from "react";
import { useLife } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { buildDemoExport } from "@/lib/demoData";

/** Premium demo loader — same safety sequence as the classic DemoButton:
 *  sign out of cloud first so demo data never syncs to the real account. */
export default function ProDemoButton({ compact = false }: { compact?: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadDemo() {
    setBusy(true);
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    try {
      localStorage.removeItem("lifeos_synced_at");
    } catch {}
    useLife.getState().importData(buildDemoExport());
    try {
      localStorage.setItem("lifeos_demo_clock", String(14 * 60 + 30));
    } catch {}
    setBusy(false);
    setMsg("✓ 演示数据已加载 — 真实数据安全在云端，到「设置 · 云同步」重新登录即可恢复。");
  }

  if (compact) {
    return (
      <button
        onClick={loadDemo}
        disabled={busy}
        className="rounded-full border border-lux-line/70 bg-lux-card/60 px-4 py-2 text-sm text-lux-dim backdrop-blur-md transition-transform active:scale-95 disabled:opacity-50"
      >
        {busy ? "加载中…" : "看一个示例的一天 →"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-relaxed text-lux-faint">
        一键填充一套通用示例数据,用来演示给别人看(不含你的真实数据)。会覆盖当前本地数据并退出云同步以保护你的账号 —— 演示完在「云同步」重新登录就恢复了。
      </p>
      <button
        onClick={loadDemo}
        disabled={busy}
        className="w-full rounded-2xl border border-lux-amber/40 bg-lux-amber/10 py-3 text-sm font-medium text-lux-amber transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? "加载中…" : "🎬 加载演示数据"}
      </button>
      {msg && <p className="text-[11px] leading-relaxed text-lux-sage">{msg}</p>}
    </div>
  );
}

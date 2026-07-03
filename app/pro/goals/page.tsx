"use client";

import { useState } from "react";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { GoalTier } from "@/lib/types";

const TIERS: { id: GoalTier; label: string; color: string }[] = [
  { id: "highest", label: "最高优先级", color: "text-lux-amber" },
  { id: "high", label: "高优先级", color: "text-lux-sage" },
  { id: "low", label: "低优先级", color: "text-lux-faint" },
];

export default function ProGoalsPage() {
  const hydrated = useHydrated();
  const goals = useLife((s) => s.goals);
  const addGoal = useLife((s) => s.addGoal);
  const updateGoal = useLife((s) => s.updateGoal);
  const removeGoal = useLife((s) => s.removeGoal);

  const [title, setTitle] = useState("");
  const [tier, setTier] = useState<GoalTier>("high");

  if (!hydrated)
    return <div className="flex min-h-dvh items-center justify-center text-lux-faint">…</div>;

  function add() {
    if (!title.trim()) return;
    const weight = tier === "highest" ? 9 : tier === "high" ? 6 : 3;
    addGoal({ title: title.trim(), tier, weight });
    setTitle("");
  }

  return (
    <div className="pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-6">
        <h1 className="text-[26px] font-extrabold tracking-tight text-lux-text">人生目标 🎯</h1>
        <p className="mt-1 text-sm text-lux-faint">长期目标决定每天任务的排序权重。</p>
      </header>

      <div className="rounded-[22px] bg-white p-4 shadow-[var(--lux-shadow)]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="添加一个长期目标…"
          className="w-full bg-transparent text-[15px] text-lux-text placeholder:text-lux-faint focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTier(t.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  tier === t.id
                    ? "border-lux-sage bg-lux-sage/10 text-lux-sage"
                    : "border-lux-line/70 text-lux-faint"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={add}
            className="rounded-full px-4 py-1.5 text-xs font-semibold text-lux-bg"
            style={{ backgroundImage: "var(--grad-sage)" }}
          >
            添加
          </button>
        </div>
      </div>

      {TIERS.map((t) => {
        const group = goals.filter((g) => g.tier === t.id);
        if (group.length === 0) return null;
        return (
          <div key={t.id} className="mt-6">
            <p className={`mb-2 text-[11px] uppercase tracking-widest ${t.color}`}>{t.label}</p>
            <div className="space-y-2">
              {group.map((g) => (
                <div
                  key={g.id}
                  className="rounded-[22px] bg-white p-3.5 shadow-[var(--lux-shadow)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-lux-text">{g.title}</p>
                    <button onClick={() => removeGoal(g.id)} className="text-xs text-lux-faint">
                      移除
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={g.weight}
                      onChange={(e) => updateGoal(g.id, { weight: Number(e.target.value) })}
                      className="h-1 flex-1 accent-lux-sage"
                    />
                    <span className="numeric w-10 text-right text-xs text-lux-dim">
                      权重 {g.weight}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {TIERS.map((tt) => (
                      <button
                        key={tt.id}
                        onClick={() => updateGoal(g.id, { tier: tt.id })}
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${
                          g.tier === tt.id
                            ? "border-lux-sage text-lux-sage"
                            : "border-lux-line/70 text-lux-faint"
                        }`}
                      >
                        {tt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

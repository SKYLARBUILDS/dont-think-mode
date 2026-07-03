"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import CloudSyncSettings from "@/components/CloudSyncSettings";
import ProDemoButton from "@/components/pro/ProDemoButton";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { ensureNotificationPermission, chime } from "@/lib/notifications";

function toHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function toMin(v: string) {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
}

export default function ProSettingsPage() {
  const hydrated = useHydrated();
  const settings = useLife((s) => s.settings);
  const update = useLife((s) => s.updateSettings);
  const exportData = useLife((s) => s.exportData);
  const importData = useLife((s) => s.importData);
  const markBackup = useLife((s) => s.markBackup);
  const lastBackupAt = useLife((s) => s.lastBackupAt);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function handleExport() {
    const json = exportData();
    const filename = `life-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const file = new File([json], filename, { type: "application/json" });
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Life OS 备份" });
        markBackup();
        setMsg({ tone: "ok", text: "已分享 ✓ 选「存到文件」→ iCloud › LifeOS" });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        setMsg({ tone: "err", text: "已取消" });
        return;
      }
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    markBackup();
    setMsg({ tone: "ok", text: "已导出备份文件 ✓" });
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const res = importData(String(reader.result ?? ""));
      setMsg(
        res.ok
          ? { tone: "ok", text: "导入成功 ✓ 数据已恢复" }
          : { tone: "err", text: `导入失败：${res.error}` }
      );
    };
    reader.onerror = () => setMsg({ tone: "err", text: "读取文件失败" });
    reader.readAsText(file);
  }

  if (!hydrated)
    return <div className="flex min-h-dvh items-center justify-center text-lux-faint">…</div>;

  const DAY = 86_400_000;
  const daysSinceBackup =
    lastBackupAt != null ? Math.floor((Date.now() - lastBackupAt) / DAY) : null;
  const backupOverdue = daysSinceBackup == null || daysSinceBackup >= 7;
  const backupStatus =
    daysSinceBackup == null
      ? "还没有备份过 — 建议先导出一份"
      : daysSinceBackup === 0
      ? "上次备份：今天 ✓"
      : `上次备份：${daysSinceBackup} 天前${backupOverdue ? " — 该备份了" : ""}`;

  return (
    <div className="pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-6">
        <h1 className="text-[26px] font-extrabold tracking-tight text-lux-text">设置 ⚙️</h1>
        <p className="mt-1 text-sm text-lux-faint">调好一次，之后就别再想。</p>
      </header>

      <Link
        href="/plan"
        className="mb-2 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-[var(--lux-shadow)]"
      >
        <div>
          <p className="text-sm text-lux-text">← 回到经典版</p>
          <p className="text-[11px] text-lux-faint">同一份数据，随时来回切换</p>
        </div>
      </Link>

      <Group title="你">
        <div>
          <label className="text-sm text-lux-dim">称呼（可选）</label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="主页问候里怎么称呼你"
            className="mt-1.5 w-full rounded-lg border border-lux-line/70 bg-lux-card px-3 py-2 text-sm text-lux-text placeholder:text-lux-faint focus:border-lux-sage/50 focus:outline-none"
          />
        </div>
      </Group>

      <Group title="作息">
        <Field label="起床时间">
          <input
            type="time"
            value={toHHMM(settings.wakeMinutes)}
            onChange={(e) => update({ wakeMinutes: toMin(e.target.value) })}
            className="rounded-lg border border-lux-line/70 bg-lux-card px-3 py-1.5 text-lux-text"
          />
        </Field>
        <Field label="睡觉时间">
          <input
            type="time"
            value={toHHMM(settings.sleepMinutes)}
            onChange={(e) => update({ sleepMinutes: toMin(e.target.value) })}
            className="rounded-lg border border-lux-line/70 bg-lux-card px-3 py-1.5 text-lux-text"
          />
        </Field>
      </Group>

      <Group title="每日节奏">
        <Link
          href="/pro/schedule"
          className="flex items-center justify-between rounded-lg border border-lux-line/70 bg-lux-card px-3 py-3"
        >
          <div>
            <p className="text-sm text-lux-text">编辑每日时间块</p>
            <p className="text-[11px] text-lux-faint">改时间、加/删块、设番茄工作段</p>
          </div>
          <span className="text-lux-dim">→</span>
        </Link>
      </Group>

      <Group title="番茄钟">
        <Stepper label="专注时长" value={settings.focusLength} unit="分钟" onChange={(v) => update({ focusLength: v })} min={10} max={60} step={5} />
        <Stepper label="短休息" value={settings.breakLength} unit="分钟" onChange={(v) => update({ breakLength: v })} min={1} max={15} step={1} />
        <Stepper label="长休息" value={settings.longBreakLength} unit="分钟" onChange={(v) => update({ longBreakLength: v })} min={10} max={30} step={5} />
      </Group>

      <Group title="提醒">
        <Toggle
          label="浏览器 / PWA 通知"
          value={settings.notifications}
          onChange={async (v) => {
            if (v) {
              const ok = await ensureNotificationPermission();
              update({ notifications: ok });
            } else update({ notifications: false });
          }}
        />
        <Toggle
          label="声音提醒"
          value={settings.sound}
          onChange={(v) => {
            update({ sound: v });
            if (v) chime("focusDone");
          }}
        />
        <div className="flex gap-2">
          <button onClick={() => chime("focusDone")} className="flex-1 rounded-xl border border-lux-line/70 bg-lux-card px-3 py-2.5 text-xs text-lux-dim">
            🔉 试听 · 该休息了
          </button>
          <button onClick={() => chime("restDone")} className="flex-1 rounded-xl border border-lux-line/70 bg-lux-card px-3 py-2.5 text-xs text-lux-dim">
            🔊 试听 · 回到专注
          </button>
        </div>
      </Group>

      <Group title="AI 排序">
        <div>
          <label className="text-sm text-lux-dim">AI API Key（可选）</label>
          <input
            type="password"
            value={settings.openaiKey}
            onChange={(e) => update({ openaiKey: e.target.value })}
            placeholder="sk-…（OpenAI） 或 AIza…（Gemini）"
            className="mt-1.5 w-full rounded-lg border border-lux-line/70 bg-lux-card px-3 py-2 text-sm text-lux-text placeholder:text-lux-faint focus:border-lux-sage/50 focus:outline-none"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-lux-faint">
            支持 OpenAI（sk-…）或 Google Gemini（AIza…）。Key 只存在本机浏览器，仅用于排序任务。留空时使用结合目标权重的本地智能排序。
          </p>
        </div>
      </Group>

      <Group title="目标">
        <Link href="/pro/goals" className="flex items-center justify-between text-sm text-lux-dim">
          调整 Life Goals 与权重
          <span className="text-lux-faint">→</span>
        </Link>
      </Group>

      <Group title="云同步">
        <CloudSyncSettings />
      </Group>

      <Group title="演示模式">
        <ProDemoButton />
      </Group>

      <Group title="数据备份">
        <p className="text-[11px] leading-relaxed text-lux-faint">
          数据只存在这台设备的浏览器里。换设备、清缓存前，先手动导出一份；在新设备上导入即可恢复目标、历史与连续天数。
        </p>
        <Toggle
          label="每晚备份提醒（11:30pm）"
          value={settings.nightlyBackup}
          onChange={(v) => update({ nightlyBackup: v })}
        />
        <p className={`text-[11px] ${backupOverdue ? "text-lux-amber" : "text-lux-faint"}`}>
          {backupStatus}
        </p>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex-1 rounded-lg border border-lux-line/70 bg-lux-card py-2 text-sm text-lux-text">
            ↓ 导出备份
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-lg border border-lux-line/70 bg-lux-card py-2 text-sm text-lux-text">
            ↑ 导入恢复
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImportFile(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => {
            try {
              const ring: { at: string; payload: string }[] = JSON.parse(
                localStorage.getItem("lifeos_undo_ring") ?? "[]"
              );
              if (!ring.length) {
                setMsg({ tone: "err", text: "还没有可恢复的快照" });
                return;
              }
              const when = new Date(ring[0].at).toLocaleString();
              if (!confirm(`回到 ${when} 之前的数据?当前状态也会先存一份快照。`)) return;
              const res = importData(ring[0].payload);
              setMsg(
                res.ok
                  ? { tone: "ok", text: `已恢复到 ${when} 的快照 ✓` }
                  : { tone: "err", text: `恢复失败:${res.error}` }
              );
            } catch {
              setMsg({ tone: "err", text: "快照读取失败" });
            }
          }}
          className="w-full rounded-lg border border-lux-line/70 bg-lux-card py-2 text-sm text-lux-dim"
        >
          ↩️ 后悔键 · 恢复上一份数据
        </button>
        <p className="text-[10px] leading-relaxed text-lux-faint">
          每次导入 / 云同步覆盖前都会自动留一份快照(最近 3 份)。手滑了就点这里。
        </p>
        {msg && (
          <p className={`text-xs ${msg.tone === "ok" ? "text-lux-sage" : "text-lux-amber"}`}>
            {msg.text}
          </p>
        )}
      </Group>

      <p className="mt-8 text-center text-xs text-lux-faint">
        Don't Think Mode · Pro · 本地优先，数据存在你的设备上。
      </p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="mb-2 ml-1 text-[13px] font-bold text-lux-text">{title}</p>
      <div className="space-y-4 rounded-[24px] bg-white p-4 shadow-[var(--lux-shadow)]">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-lux-dim">{label}</span>
      {children}
    </div>
  );
}

function Stepper({
  label,
  value,
  unit,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-lux-dim">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(min, value - step))} className="h-7 w-7 rounded-lg border border-lux-line/70 bg-lux-card text-lux-dim">
          −
        </button>
        <span className="numeric w-16 text-center text-sm text-lux-text">
          {value} {unit}
        </span>
        <button onClick={() => onChange(Math.min(max, value + step))} className="h-7 w-7 rounded-lg border border-lux-line/70 bg-lux-card text-lux-dim">
          +
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-lux-dim">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-lux-sage" : "bg-lux-line"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-lux-bg transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

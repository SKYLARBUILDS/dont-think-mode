"use client";

import { useMemo, useRef, useState } from "react";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { fmtClock } from "@/lib/time";
import { buildDayCard, buildPeriodCard, shareImageBlob } from "@/lib/shareCard";
import PremiumRing from "@/components/pro/PremiumRing";
import TrendChart from "@/components/pro/TrendChart";
import Donut from "@/components/pro/Donut";
import GradientText from "@/components/pro/GradientText";
import Reveal from "@/components/pro/Reveal";

export default function ProReviewPage() {
  const hydrated = useHydrated();
  const today = useLife((s) => s.today);
  const history = useLife((s) => s.history);
  const tasks = useLife((s) => s.tasks);
  const streak = useLife((s) => s.streak);
  const settings = useLife((s) => s.settings);
  const blocks = useLife((s) => s.schedule);
  const adjustHistoryDay = useLife((s) => s.adjustHistoryDay);
  const toggleHistoryTask = useLife((s) => s.toggleHistoryTask);
  const ensureHistoryDay = useLife((s) => s.ensureHistoryDay);
  const todayKey = today.date;

  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [cardBusy, setCardBusy] = useState(false);
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "all">("month");
  const [editDate, setEditDate] = useState<string | null>(null);
  const [addText, setAddText] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);

  const all = useMemo(() => [today, ...history], [today, history]);
  const week = useMemo(() => all.slice(0, 7), [all]);
  const month = useMemo(() => all.slice(0, 30), [all]);
  const weekAvg = week.length
    ? Math.round(week.reduce((n, d) => n + d.score, 0) / week.length)
    : 0;
  const monthAvg = month.length
    ? Math.round(month.reduce((n, d) => n + d.score, 0) / month.length)
    : 0;


  if (!hydrated)
    return (
      <div className="flex min-h-dvh items-center justify-center text-lux-faint">
        …
      </div>
    );

  const doneTasks = tasks.filter((t) => t.done);
  const doneBlocks = today.completedBlocks
    .map((id) => blocks.find((b) => b.id === id)?.title)
    .filter((x): x is string => !!x);
  const nothingYet =
    doneBlocks.length === 0 && doneTasks.length === 0 && today.pomodorosDone === 0;

  const periodDays =
    period === "week"
      ? week
      : period === "month"
      ? month
      : period === "quarter"
      ? all.slice(0, 90)
      : all;
  const periodItems = periodDays.map((d) => ({
    date: d.date,
    score: d.score,
    pomos: d.pomodorosDone,
    focus: d.focusMinutes,
    tasks: d.completedTasks ?? [],
    blocks: (d.completedBlocks ?? [])
      .map((id) => blocks.find((b) => b.id === id)?.title)
      .filter((x): x is string => !!x),
  }));
  const sumTasks = periodItems.reduce((n, d) => n + d.tasks.length, 0);
  const sumPomos = periodDays.reduce((n, d) => n + d.pomodorosDone, 0);
  const sumFocus = periodDays.reduce((n, d) => n + d.focusMinutes, 0);
  const daysMet = periodDays.filter((d) => d.score >= 60).length;
  const itemDays = periodItems.filter(
    (d) => d.tasks.length > 0 || d.blocks.length > 0 || d.pomos > 0 || d.date === editDate
  );

  const periodWord =
    period === "week" ? "这周" : period === "month" ? "这个月" : period === "quarter" ? "近三个月" : "至今";
  const avgScore = periodDays.length
    ? Math.round(periodDays.reduce((n, d) => n + d.score, 0) / periodDays.length)
    : 0;

  // Group the day cards by calendar month so older months can be scrolled back to.
  type DayItem = (typeof itemDays)[number];
  const monthGroups: { ym: string; days: DayItem[] }[] = [];
  for (const d of itemDays) {
    const ym = d.date.slice(0, 7);
    let g = monthGroups.find((x) => x.ym === ym);
    if (!g) {
      g = { ym, days: [] };
      monthGroups.push(g);
    }
    g.days.push(d);
  }
  const monthLabel = (ym: string) => `${ym.slice(0, 4)} 年 ${parseInt(ym.slice(5), 10)} 月`;

  // Trend chart: cap to a readable window (last 7 for week, last 30 otherwise).
  const trendSrc = periodDays.slice(0, period === "week" ? 7 : 30).reverse();
  const labelStep = Math.max(1, Math.ceil(trendSrc.length / 7));
  const trendPoints = trendSrc.map((d, i) => ({
    label: trendSrc.length <= 10 || i % labelStep === 0 ? d.date.slice(5) : "",
    value: d.score,
  }));

  const checks: { label: string; ok: boolean }[] = [
    { label: "早起 · Morning Routine", ok: today.completedBlocks.includes("morning-upgrade") },
    { label: "健身", ok: today.fitnessDone },
    { label: "跳舞", ok: today.danceDone },
    { label: "晨间养护", ok: today.beautyDone },
    { label: `${fmtClock(settings.sleepMinutes)} 前睡觉`, ok: today.sleptOnTime },
  ];

  async function genCard(d: {
    date: string;
    score: number;
    pomodoros: number;
    focusMinutes: number;
    completed: string[];
    streak?: number;
  }) {
    setCardBusy(true);
    const blob = await buildDayCard({
      date: d.date,
      score: d.score,
      pomodoros: d.pomodoros,
      focusMinutes: d.focusMinutes,
      streak: d.streak ?? 0,
      completed: d.completed,
      name: settings.name,
    });
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    setCardBlob(blob);
    setCardUrl(URL.createObjectURL(blob));
    setCardBusy(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeCard() {
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    setCardUrl(null);
    setCardBlob(null);
  }

  const fmtD = (s: string) => `${parseInt(s.slice(5, 7), 10)}月${parseInt(s.slice(8, 10), 10)}日`;

  async function genPeriodCard() {
    setCardBusy(true);
    const first = periodDays[periodDays.length - 1]?.date ?? todayKey;
    const last = periodDays[0]?.date ?? todayKey;
    const blob = await buildPeriodCard({
      title:
        period === "week" ? "本周报告" : period === "month" ? "本月报告" : period === "quarter" ? "近三月报告" : "全部报告",
      range: `${fmtD(first)} – ${fmtD(last)}`,
      avgScore,
      tasks: sumTasks,
      pomodoros: sumPomos,
      focusHours: Math.round(sumFocus / 60),
      daysMet,
      totalDays: periodDays.length,
      topTasks: itemDays.flatMap((d) => d.tasks),
      name: settings.name,
    });
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    setCardBlob(blob);
    setCardUrl(URL.createObjectURL(blob));
    setCardBusy(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Back-fill an arbitrary past day — creates a blank record if that day isn't
  // in history yet, widens the range so it's visible, and opens its editor.
  function backfillDay(date: string) {
    if (!date || date > todayKey || date === todayKey) return;
    ensureHistoryDay(date);
    setPeriod("all");
    setEditDate(date);
    setTimeout(() => {
      const el = document.getElementById(`day-${date}`);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
  }

  // ── Past-day editing (history only — today stays editable everywhere else) ──
  function bumpPomos(date: string, delta: number) {
    const log = history.find((h) => h.date === date);
    if (!log) return;
    adjustHistoryDay(date, {
      pomodorosDone: Math.max(0, log.pomodorosDone + delta),
      focusMinutes: Math.max(0, log.focusMinutes + delta * settings.focusLength),
    });
  }
  function toggleRitual(date: string, key: "morning" | "fitness" | "dance" | "sleep") {
    const log = history.find((h) => h.date === date);
    if (!log) return;
    if (key === "morning") {
      const has = log.completedBlocks.includes("morning-upgrade");
      adjustHistoryDay(date, {
        completedBlocks: has
          ? log.completedBlocks.filter((b) => b !== "morning-upgrade")
          : [...log.completedBlocks, "morning-upgrade"],
      });
    } else if (key === "fitness") adjustHistoryDay(date, { fitnessDone: !log.fitnessDone });
    else if (key === "dance") adjustHistoryDay(date, { danceDone: !log.danceDone });
    else if (key === "sleep") adjustHistoryDay(date, { sleptOnTime: !log.sleptOnTime });
  }

  const cardCls =
    "rounded-[26px] border border-lux-line/70 bg-lux-card/60 p-4 backdrop-blur-xl shadow-[var(--lux-shadow)]";

  return (
    <div className="pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-lux-text">回顾</h1>
        <p className="mt-1 text-sm text-lux-faint">今天过得怎么样。</p>
      </header>

      {/* Hero — score rings + streak */}
      <div className="flex flex-col items-center">
        <PremiumRing
          progress={today.score / 100}
          size={216}
          stroke={12}
          from="rgb(var(--lux-amber))"
          to="rgb(var(--lux-rose))"
        >
          <span className="numeric text-5xl font-semibold tracking-tight">
            <GradientText gradient="var(--grad-sage)">{today.score}</GradientText>
          </span>
          <span className="mt-1 text-[11px] text-lux-faint">今日得分</span>
        </PremiumRing>
        <div className="mt-4 flex items-center gap-4 text-center text-[11px] text-lux-faint">
          <span>
            <span className="numeric mr-1 text-lux-amber">今日</span>
            {today.score}
          </span>
          <span>
            <span className="numeric mr-1 text-lux-sage">周均</span>
            {weekAvg}
          </span>
          <span>
            <span className="numeric mr-1 text-lux-violet">月均</span>
            {monthAvg}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-[var(--lux-shadow)]">
          <span>🔥</span>
          <span className="numeric text-lg font-extrabold text-lux-text">{streak}</span>
          <span className="text-sm text-lux-faint">天连续达标</span>
        </div>
      </div>

      {/* Today summary */}
      <Reveal className="mt-7">
        <div className={cardCls}>
          <p className="text-[11px] uppercase tracking-widest text-lux-faint">今日小结</p>
          {nothingYet ? (
            <p className="mt-2 text-sm text-lux-dim">
              今天还没有完成的记录 — 去执行第一件事吧。
            </p>
          ) : (
            <div className="mt-2 flex items-start gap-4">
              <Donut
                value={tasks.length ? doneTasks.length / tasks.length : 0}
                size={92}
                stroke={10}
              >
                <span className="numeric text-base font-semibold text-lux-text">
                  {doneTasks.length}/{tasks.length || 0}
                </span>
                <span className="text-[9px] text-lux-faint">任务</span>
              </Donut>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-relaxed text-lux-text">
                  完成了 <span className="font-semibold text-lux-sage">{doneBlocks.length}</span> 个时间块、
                  <span className="font-semibold text-lux-sage">{today.pomodorosDone}</span> 个番茄钟、
                  <span className="font-semibold text-lux-sage">{doneTasks.length}</span> 件任务。
                </p>
                <ul className="mt-2 space-y-1">
                  {doneTasks.slice(0, 4).map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm text-lux-dim">
                      <span className="text-lux-sage">✓</span>
                      <span className="truncate line-through">{t.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* Share today's card */}
      {!nothingYet && !cardUrl && (
        <button
          onClick={() =>
            genCard({
              date: today.date,
              score: today.score,
              pomodoros: today.pomodorosDone,
              focusMinutes: today.focusMinutes,
              completed: [...doneBlocks, ...doneTasks.map((t) => t.title)],
              streak,
            })
          }
          disabled={cardBusy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-lux-amber/40 bg-lux-amber/10 py-3 text-sm font-medium text-lux-amber transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {cardBusy ? "生成中…" : "📷 生成今日卡片 · 存到相册 / 分享"}
        </button>
      )}
      {cardUrl && (
        <div className={`mt-3 ${cardCls}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardUrl} alt="今日卡片" className="w-full rounded-xl border border-lux-line/70" />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => cardBlob && shareImageBlob(cardBlob, `life-os-${today.date}.png`)}
              className="flex-1 rounded-xl py-3 text-sm font-semibold text-lux-bg"
              style={{ backgroundImage: "var(--grad-sage)" }}
            >
              存到相册 / 分享
            </button>
            <button
              onClick={closeCard}
              className="rounded-xl border border-lux-line/70 bg-lux-card/60 px-5 text-sm text-lux-dim"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Trend */}
      <Reveal className="mt-7">
        <p className="mb-2 text-[11px] uppercase tracking-widest text-lux-faint">
          {period === "week" ? "近 7 天趋势" : "近 30 天趋势"} · 平均 {avgScore} 分
        </p>
        <div className={cardCls}>
          <TrendChart points={trendPoints} />
        </div>
      </Reveal>

      {/* Today checks */}
      <Reveal className="mt-7">
        <p className="mb-2 text-[11px] uppercase tracking-widest text-lux-faint">今日总结</p>
        <div className={`space-y-2 ${cardCls}`}>
          <Row label="完成番茄钟" value={`${today.pomodorosDone} 个`} />
          <Row label="专注时长" value={`${today.focusMinutes} 分钟`} />
          <Row label="完成任务" value={`${doneTasks.length}/${tasks.length || 0}`} />
          <div className="my-2 h-px bg-lux-line/60" />
          {checks.map((c) => (
            <div key={c.label} className="flex items-center justify-between">
              <span className="text-sm text-lux-dim">{c.label}</span>
              <span className={c.ok ? "text-lux-sage" : "text-lux-faint"}>
                {c.ok ? "✓" : "—"}
              </span>
            </div>
          ))}
        </div>
      </Reveal>

      {/* 回顾 — weekly / monthly / quarterly / all rollup, grouped by month */}
      <p className="mb-2 mt-8 text-[11px] uppercase tracking-widest text-lux-faint">回顾</p>
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-full bg-white p-1 shadow-[var(--lux-shadow)]">
        {(["week", "month", "quarter", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full py-1.5 text-xs font-medium transition-colors ${
              period === p ? "text-lux-bg" : "text-lux-faint"
            }`}
            style={period === p ? { backgroundImage: "var(--grad-sage)" } : undefined}
          >
            {p === "week" ? "本周" : p === "month" ? "本月" : p === "quarter" ? "近3月" : "全部"}
          </button>
        ))}
      </div>

      {/* period summary card */}
      <div className="rounded-[26px] bg-white p-5 shadow-[var(--lux-shadow)]">
        <p className="text-[15px] leading-relaxed text-lux-text">
          {periodWord}你完成了{" "}
          <span className="font-bold text-lux-sage">{sumTasks}</span> 件任务、
          <span className="font-bold text-lux-sage">{sumPomos}</span> 个番茄钟、
          <span className="font-bold text-lux-sage">{Math.round(sumFocus / 60)}</span> 小时专注，
          <span className="font-bold text-lux-sage">{daysMet}</span>/{periodDays.length} 天达标。
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { k: "任务", v: sumTasks },
            { k: "番茄", v: sumPomos },
            { k: "达标天", v: daysMet },
            { k: "平均分", v: avgScore },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl bg-lux-bg2 px-2 py-2.5 text-center">
              <p className="numeric text-lg font-extrabold text-lux-text">{s.v}</p>
              <p className="text-[10px] text-lux-faint">{s.k}</p>
            </div>
          ))}
        </div>
      </div>

      {/* back-fill any day + generate a period report */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            try {
              dateRef.current?.showPicker?.();
            } catch {}
          }}
          className="flex-1 rounded-2xl bg-white py-3 text-sm font-medium text-lux-dim shadow-[var(--lux-shadow)]"
        >
          📅 补记某一天
        </button>
        <input
          ref={dateRef}
          type="date"
          max={todayKey}
          onChange={(e) => backfillDay(e.target.value)}
          className="sr-only"
          aria-hidden
        />
        <button
          onClick={genPeriodCard}
          disabled={cardBusy}
          className="flex-1 rounded-2xl py-3 text-sm font-semibold text-lux-bg shadow-[var(--lux-shadow)] disabled:opacity-60"
          style={{ backgroundImage: "var(--grad-sage)" }}
        >
          {cardBusy ? "生成中…" : `📊 生成${period === "week" ? "周报" : period === "month" ? "月报" : "报告"}`}
        </button>
      </div>

      {itemDays.length > 0 ? (
        <div className="mt-3 space-y-5">
          {monthGroups.map((group) => {
            const mTasks = group.days.reduce((n, d) => n + d.tasks.length, 0);
            const mPomos = group.days.reduce((n, d) => n + d.pomos, 0);
            const mMet = group.days.filter((d) => d.score >= 60).length;
            return (
              <div key={group.ym}>
                {/* month header */}
                <div className="mb-2 mt-1 flex items-baseline justify-between px-1">
                  <span className="text-[15px] font-extrabold text-lux-text">
                    {monthLabel(group.ym)}
                  </span>
                  <span className="numeric text-[11px] text-lux-faint">
                    {mTasks} 任务 · {mPomos} 🍅 · {mMet} 天达标
                  </span>
                </div>
                <div className="space-y-3">
                  {group.days.map((d) => {
            const isPast = d.date !== today.date;
            const editing = editDate === d.date;
            return (
              <div key={d.date} id={`day-${d.date}`} className={cardCls}>
                <div className="flex items-baseline justify-between">
                  <span className="numeric text-sm font-semibold text-lux-text">
                    {d.date.slice(5)}
                    {!isPast && <span className="ml-1.5 text-[10px] text-lux-amber">今天</span>}
                  </span>
                  <span className="numeric text-xs text-lux-faint">
                    {d.score} 分 · {d.pomos} 🍅
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {d.tasks.map((t, i) => (
                    <li key={`t-${i}`} className="flex items-center gap-2 text-sm text-lux-dim">
                      <span className="text-lux-sage">✓</span>
                      <span className="flex-1">{t}</span>
                      {editing && isPast && (
                        <button
                          onClick={() => toggleHistoryTask(d.date, t)}
                          aria-label="移除"
                          className="text-lux-faint"
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  ))}
                  {d.blocks.map((t, i) => (
                    <li key={`b-${i}`} className="flex items-center gap-2 text-sm text-lux-faint">
                      <span className="text-lux-sage">·</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>

                {/* Past-day editor */}
                {editing && isPast && (
                  <div className="mt-3 space-y-3 rounded-2xl border border-lux-line/60 bg-lux-bg2/40 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={addText}
                        onChange={(e) => setAddText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && addText.trim()) {
                            toggleHistoryTask(d.date, addText);
                            setAddText("");
                          }
                        }}
                        placeholder="补一件这天完成的任务…"
                        className="min-w-0 flex-1 rounded-xl border border-lux-line/70 bg-lux-card/60 px-3 py-2 text-sm text-lux-text placeholder:text-lux-faint focus:border-lux-sage/50 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (addText.trim()) {
                            toggleHistoryTask(d.date, addText);
                            setAddText("");
                          }
                        }}
                        className="rounded-xl px-3 py-2 text-sm font-semibold text-lux-bg"
                        style={{ backgroundImage: "var(--grad-sage)" }}
                      >
                        加
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-lux-faint">番茄钟</span>
                      <div className="flex items-center gap-2 rounded-full border border-lux-line/70 px-2 py-1">
                        <button onClick={() => bumpPomos(d.date, -1)} className="px-2 text-lux-dim">−</button>
                        <span className="numeric w-6 text-center text-sm text-lux-text">{d.pomos}</span>
                        <button onClick={() => bumpPomos(d.date, 1)} className="px-2 text-lux-dim">+</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        ["morning", "早起"],
                        ["fitness", "健身"],
                        ["dance", "跳舞"],
                        ["sleep", "准时睡"],
                      ] as const).map(([key, label]) => {
                        const log = history.find((h) => h.date === d.date);
                        const on =
                          key === "morning"
                            ? !!log?.completedBlocks.includes("morning-upgrade")
                            : key === "fitness"
                            ? !!log?.fitnessDone
                            : key === "dance"
                            ? !!log?.danceDone
                            : !!log?.sleptOnTime;
                        return (
                          <button
                            key={key}
                            onClick={() => toggleRitual(d.date, key)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] ${
                              on
                                ? "border-lux-sage/50 bg-lux-sage/10 text-lux-sage"
                                : "border-lux-line/70 text-lux-faint"
                            }`}
                          >
                            {on ? "✓ " : ""}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] leading-relaxed text-lux-faint">
                      补记会按「routine + 任务×8 + 番茄×5」重算这天的分数（第一要务的 +25 不会追溯）。
                    </p>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  {isPast && (
                    <button
                      onClick={() => {
                        setEditDate(editing ? null : d.date);
                        setAddText("");
                      }}
                      className="flex-1 rounded-xl border border-lux-line/70 py-2 text-xs text-lux-dim transition-transform active:scale-[0.98]"
                    >
                      {editing ? "完成补记" : "✏️ 补记这天"}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      genCard({
                        date: d.date,
                        score: d.score,
                        pomodoros: d.pomos,
                        focusMinutes: d.focus,
                        completed: [...d.tasks, ...d.blocks],
                      })
                    }
                    disabled={cardBusy}
                    className="flex-1 rounded-xl border border-lux-line/70 py-2 text-xs text-lux-faint transition-transform active:scale-[0.98] disabled:opacity-60"
                  >
                    📷 生成卡片
                  </button>
                </div>
              </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-lux-faint">
          {periodWord}还没有完成记录
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-lux-dim">{label}</span>
      <span className="numeric text-sm text-lux-text">{value}</span>
    </div>
  );
}

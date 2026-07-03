"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLife } from "@/lib/store";
import { useTick, useHydrated } from "@/lib/hooks";
import { resolveSchedule } from "@/lib/schedule";
import { scoreLevers } from "@/lib/score";
import { fmtClock, fmtLeft, fmtDuration, nowMinutes, greeting } from "@/lib/time";
import PremiumRing from "@/components/pro/PremiumRing";
import JourneyTimeline from "@/components/pro/JourneyTimeline";
import TaskRing from "@/components/pro/TaskRing";
import Reveal from "@/components/pro/Reveal";
import GradientText from "@/components/pro/GradientText";
import Confetti from "@/components/pro/Confetti";

export default function ProTodayPage() {
  const hydrated = useHydrated();
  const now = useTick(1000);
  const settings = useLife((s) => s.settings);
  const schedule = useLife((s) => s.schedule);
  const today = useLife((s) => s.today);
  const history = useLife((s) => s.history);
  const tasks = useLife((s) => s.tasks);
  const activeTaskId = useLife((s) => s.activeTaskId);
  const streak = useLife((s) => s.streak);
  const completeBlock = useLife((s) => s.completeBlock);
  const uncompleteBlock = useLife((s) => s.uncompleteBlock);
  const skipBlock = useLife((s) => s.skipBlock);
  const unskipBlock = useLife((s) => s.unskipBlock);
  const setFitness = useLife((s) => s.setFitness);
  const setDance = useLife((s) => s.setDance);
  const setSleptOnTime = useLife((s) => s.setSleptOnTime);
  const toggleTaskDone = useLife((s) => s.toggleTaskDone);
  const ensureToday = useLife((s) => s.ensureToday);

  const pomoPhase = useLife((s) => s.pomoPhase);
  const pomoRunning = useLife((s) => s.pomoRunning);
  const pomoEndsAt = useLife((s) => s.pomoEndsAt);
  const pomoRemaining = useLife((s) => s.pomoRemaining);

  const [burst, setBurst] = useState(0);

  useEffect(() => {
    ensureToday();
  }, [ensureToday]);

  const shift = today.shiftMinutes ?? 0;
  const blocks = useMemo(
    () => schedule.map((b) => ({ ...b, start: b.start + shift, end: b.end + shift })),
    [schedule, shift]
  );
  const min = nowMinutes(now);
  const state = resolveSchedule(blocks, min);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-lux-faint">
        …
      </div>
    );
  }

  const ordered = [...tasks].sort(
    (a, b) => Number(a.done) - Number(b.done) || a.rank - b.rank
  );
  const activeTask = activeTaskId
    ? ordered.find((t) => t.id === activeTaskId && !t.done && !t.optional)
    : undefined;
  const topTask = activeTask ?? ordered.find((t) => !t.done && !t.optional);
  const planDone = ordered.filter((t) => t.done).length;
  const doneToday = state.now ? today.completedBlocks.includes(state.now.id) : false;
  const movedOn = state.now
    ? (today.skippedBlocks ?? []).includes(state.now.id)
    : false;
  const advanced = doneToday || movedOn;

  const isWorkNow = !!state.now?.pomodoro && !advanced;
  const pomoIsBreak = pomoPhase !== "focus";
  const pomoTotalSec =
    (pomoPhase === "focus"
      ? settings.focusLength
      : pomoPhase === "break"
      ? settings.breakLength
      : settings.longBreakLength) * 60;
  const pomoRemainSec =
    pomoRunning && pomoEndsAt
      ? Math.max(0, Math.round((pomoEndsAt - Date.now()) / 1000))
      : pomoRemaining;
  const pomoProgress = pomoTotalSec ? 1 - pomoRemainSec / pomoTotalSec : 0;

  const rank1 = tasks.find((t) => t.rank === 1);
  const levers = scoreLevers(today, rank1?.done ?? false);
  const remainingLevers = levers.filter((l) => !l.done);
  const remainingPoints = remainingLevers.reduce((n, l) => n + l.points, 0);

  // Reframe accumulated productivity as a game level + XP.
  const totalXP = today.score + history.reduce((n, d) => n + d.score, 0);
  const LVL = 500;
  const level = Math.floor(totalXP / LVL) + 1;
  const xpInLevel = totalXP % LVL;
  const xpProgress = xpInLevel / LVL;

  // A single live ring — the current block / pomodoro progress.
  const onFocus = isWorkNow && !pomoIsBreak;
  const ringFrom = onFocus ? "rgb(var(--lux-amber))" : "rgb(var(--lux-sage))";
  const ringTo = onFocus ? "rgb(var(--lux-rose))" : "rgb(var(--lux-cyan))";
  const ringProg = isWorkNow ? pomoProgress : advanced ? 1 : state.now ? state.progress : 0;

  function completeLever(key: string) {
    switch (key) {
      case "morning":
        completeBlock("morning-upgrade", 20);
        break;
      case "topTask":
        if (rank1) toggleTaskDone(rank1.id);
        break;
      case "fitness":
        setFitness(true);
        break;
      case "dance":
        setDance(true);
        break;
      case "sleep":
        setSleptOnTime(true);
        break;
    }
    setBurst((b) => b + 1);
  }

  const isWinddown = state.now?.type === "winddown" || state.now?.type === "sleep";

  return (
    <div className={`pb-32 pt-[max(1rem,env(safe-area-inset-top))] ${isWinddown ? "winddown" : ""}`}>
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-2xl shadow-[var(--lux-shadow)]">
            <span className="animate-bob">🦊</span>
          </div>
          <div>
            <p className="text-[17px] font-extrabold tracking-tight text-lux-text">
              {greeting(min)}
              {settings.name ? `，${settings.name}` : ""}
            </p>
            <p className="numeric text-xs text-lux-faint">{fmtClock(min)} · 今天</p>
          </div>
        </div>
        <Link
          href="/pro/settings"
          aria-label="设置"
          className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-lg text-lux-dim shadow-[var(--lux-shadow)]"
        >
          ⚙
        </Link>
      </header>

      {/* Level / XP — productivity reframed as a game */}
      <Link href="/pro/review" className="mb-5 block">
        <div className="rounded-[28px] bg-white p-5 shadow-[var(--lux-shadow)]">
          <div className="flex items-baseline justify-between">
            <span className="text-[19px] font-extrabold tracking-tight text-lux-text">
              Level {level}
            </span>
            <span className="numeric text-sm font-bold text-lux-dim">
              {totalXP.toLocaleString()} XP
            </span>
          </div>
          <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-lux-bg-2 ring-1 ring-lux-line">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--grad-sage)" }}
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress * 100}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[12px]">
            <span className="text-lux-faint">
              距 Level {level + 1} 还差 {LVL - xpInLevel} XP
            </span>
            <span className="font-bold text-lux-sage">🔥 {streak} 天连胜</span>
          </div>
        </div>
      </Link>

      {/* NOW hero — day activity rings wrapping the live countdown */}
      <section className="relative flex flex-col items-center">
        <span className="mb-3 text-[11px] tracking-[0.4em] text-lux-faint">
          此 刻
        </span>
        {burst > 0 && <Confetti key={burst} />}
        <Link
          href={isWorkNow ? "/pro/focus" : "/pro"}
          className="relative"
          aria-label="进入专注"
        >
          <PremiumRing progress={ringProg} from={ringFrom} to={ringTo} size={264} stroke={12}>
            {isWorkNow ? (
              <>
                <span className="numeric text-[2.6rem] font-light leading-none tracking-tight text-lux-text">
                  {fmtDuration(pomoRemainSec)}
                </span>
                <span className="mt-1 text-xs text-lux-amber">
                  {pomoIsBreak ? "休息中" : "专注中"} · 进入 →
                </span>
              </>
            ) : state.now ? (
              advanced ? (
                <>
                  <span className={`text-4xl ${doneToday ? "text-lux-sage" : "text-lux-faint"}`}>
                    {doneToday ? "✓" : "→"}
                  </span>
                  {state.next && (
                    <span className="mt-1 text-xs text-lux-faint">
                      下一项 {fmtLeft(Math.max(0, state.next.start - min))}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="numeric text-[2.6rem] font-light leading-none tracking-tight text-lux-text">
                    {fmtLeft(state.minutesLeft)}
                  </span>
                  <span className="mt-1 text-xs text-lux-faint">剩余</span>
                </>
              )
            ) : (
              <span className="px-8 text-center text-sm text-lux-faint">
                {state.beforeDay ? "新的一天即将开始" : "今天已经结束"}
              </span>
            )}
          </PremiumRing>
        </Link>

        <div className="mt-5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-lux-text">
            {state.now?.title ?? "Rest"}
          </h1>
          {doneToday ? (
            <p className="mt-1 text-sm text-lux-sage">
              ✓ 已完成{state.next ? ` · 下一项 ${state.next.title}` : ""}
            </p>
          ) : movedOn ? (
            <p className="mt-1 text-sm text-lux-faint">→ 已提前进入下一项</p>
          ) : (
            state.now?.subtitle && (
              <p className="mt-0.5 text-sm text-lux-dim">{state.now.subtitle}</p>
            )
          )}
          {state.now && (
            <p className="numeric mt-1 text-xs text-lux-faint">
              {fmtClock(state.now.start)} – {fmtClock(state.now.end)}
            </p>
          )}
        </div>

        {/* Current task chip → focus */}
        {!advanced && state.now?.pomodoro && topTask && (
          <Link
            href="/pro/focus"
            className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-lux-line/70 bg-lux-card/60 px-4 py-3 backdrop-blur-md"
          >
            <TaskRing done={topTask.donePomodoros} total={topTask.pomodoros} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-lux-amber">
                深度工作 · 任务 1
              </p>
              <p className="truncate font-medium text-lux-text">{topTask.title}</p>
            </div>
            <span className="text-lux-amber">→</span>
          </Link>
        )}
        {!advanced && state.now?.pomodoro && !topTask && (
          <Link
            href="/pro/plan"
            className="mt-5 w-full rounded-2xl border border-dashed border-lux-line px-4 py-3 text-center text-sm text-lux-dim"
          >
            还没有今日任务 — 去输入并让 AI 排序 →
          </Link>
        )}

        {/* Block actions */}
        <div className="mt-5 w-full">
          {state.now && advanced && (
            <button
              onClick={() =>
                doneToday ? uncompleteBlock(state.now!.id) : unskipBlock(state.now!.id)
              }
              className="w-full rounded-2xl border border-lux-line/70 bg-lux-card/60 py-3 text-sm font-medium text-lux-dim backdrop-blur-md transition-transform active:scale-[0.98]"
            >
              ↩ 撤销，回到这一块
            </button>
          )}
          {state.now && !advanced && state.now.pomodoro && (
            <button
              onClick={() => skipBlock(state.now!.id)}
              className="w-full rounded-2xl border border-lux-line/70 bg-lux-card/60 py-3 text-sm font-medium text-lux-dim backdrop-blur-md transition-transform active:scale-[0.98]"
            >
              提前结束这段，进入下一项 →
            </button>
          )}
          {state.now && !advanced && !state.now.pomodoro && (
            <>
              <button
                onClick={() => completeBlock(state.now!.id, state.now!.score)}
                className="w-full rounded-2xl py-3.5 text-sm font-semibold text-lux-bg shadow-[var(--lux-shadow)] transition-transform active:scale-[0.98]"
                style={{ backgroundImage: "var(--grad-sage)" }}
              >
                完成这个时间块 · +{state.now.score}
              </button>
              <button
                onClick={() => skipBlock(state.now!.id)}
                className="mt-2 w-full rounded-2xl border border-lux-line/60 py-2 text-xs text-lux-faint"
              >
                没做完？提前进入下一项（不算完成）→
              </button>
            </>
          )}
        </div>
      </section>

      {/* NEXT */}
      {state.next && (
        <Reveal className="mt-8">
          <span className="text-[11px] tracking-[0.4em] text-lux-faint">
            接下来
          </span>
          <div className="mt-2 flex items-center justify-between rounded-2xl border border-lux-line/70 bg-lux-card/50 px-4 py-3 backdrop-blur-md">
            <div>
              <p className="font-medium text-lux-text">{state.next.title}</p>
              {state.next.subtitle && (
                <p className="text-xs text-lux-faint">{state.next.subtitle}</p>
              )}
            </div>
            <span className="numeric text-sm text-lux-dim">
              {fmtClock(state.next.start)}
            </span>
          </div>
        </Reveal>
      )}

      {/* 今天拉满 — levers */}
      <Reveal className="mt-8">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.4em] text-lux-faint">
            今天拉满
          </span>
          <span className="numeric text-xs text-lux-faint">
            {remainingLevers.length === 0 ? "关键分已拉满" : `还差 ${remainingPoints} 分`}
          </span>
        </div>
        {remainingLevers.length === 0 ? (
          <div className="rounded-2xl border border-lux-sage/30 bg-lux-sage/10 px-4 py-3 text-sm text-lux-sage">
            ✓ 今天的关键分全部拿下 — 漂亮。
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {remainingLevers.map((l) => {
              if (l.key === "topTask" && !rank1) {
                return (
                  <Link
                    key={l.key}
                    href="/pro/plan"
                    className="rounded-full border border-lux-line/70 bg-lux-card/60 px-3.5 py-2 text-sm text-lux-dim backdrop-blur-md"
                  >
                    {l.label} <span className="numeric text-lux-faint">+{l.points}</span>
                  </Link>
                );
              }
              return (
                <button
                  key={l.key}
                  onClick={() => completeLever(l.key)}
                  className="rounded-full border border-lux-line/70 bg-lux-card/60 px-3.5 py-2 text-sm text-lux-text backdrop-blur-md transition-transform active:scale-95"
                >
                  {l.label} <span className="numeric text-lux-amber">+{l.points}</span>
                </button>
              );
            })}
          </div>
        )}
      </Reveal>

      {/* 今日计划 */}
      {ordered.length > 0 && (
        <Reveal className="mt-8">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-[0.4em] text-lux-faint">
              今日计划
            </span>
            <Link href="/pro/plan" className="text-[11px] text-lux-faint">
              完成 {planDone}/{ordered.length} · 编辑 →
            </Link>
          </div>
          <ul className="space-y-2">
            {ordered.map((t) => (
              <li
                key={t.id}
                className={`flex items-center gap-3 rounded-2xl border border-lux-line/70 bg-lux-card/50 px-3 py-2.5 backdrop-blur-md ${
                  t.done || t.optional ? "opacity-55" : ""
                }`}
              >
                <button
                  onClick={() => toggleTaskDone(t.id)}
                  aria-label="切换完成"
                  className="shrink-0"
                >
                  <TaskRing done={t.done ? t.pomodoros : t.donePomodoros} total={t.pomodoros} />
                </button>
                <span
                  className={`min-w-0 flex-1 truncate text-[15px] text-lux-text ${
                    t.done || t.optional ? "line-through" : ""
                  }`}
                >
                  {t.title}
                </span>
                <span className="numeric shrink-0 text-[11px] text-lux-faint">
                  {t.done ? t.pomodoros : t.donePomodoros}/{t.pomodoros} 🍅
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {/* The day as a journey */}
      <div className="mt-10">
        <p className="mb-3 text-[11px] uppercase tracking-[0.4em] text-lux-faint">
          今天的轨迹
        </p>
        <JourneyTimeline min={min} shift={shift} />
      </div>

      <p className="mt-10 text-center text-sm leading-relaxed text-lux-faint">
        打开就执行，<br />不必再想。
      </p>
    </div>
  );
}

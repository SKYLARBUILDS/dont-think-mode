"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLife } from "@/lib/store";
import { useHydrated, useTick } from "@/lib/hooks";
import { fmtDuration } from "@/lib/time";
import { productivityScore } from "@/lib/score";
import { ensureNotificationPermission, primeAudio } from "@/lib/notifications";
import PremiumRing from "@/components/pro/PremiumRing";
import TaskWheel from "@/components/pro/TaskWheel";
import Burndown from "@/components/pro/Burndown";
import Stat from "@/components/pro/Stat";
import Confetti from "@/components/pro/Confetti";

export default function ProFocusPage() {
  const hydrated = useHydrated();
  const settings = useLife((s) => s.settings);
  const tasks = useLife((s) => s.tasks);
  const today = useLife((s) => s.today);
  const toggleDone = useLife((s) => s.toggleTaskDone);
  const activeTaskId = useLife((s) => s.activeTaskId);
  const setActiveTask = useLife((s) => s.setActiveTask);

  const phase = useLife((s) => s.pomoPhase);
  const running = useLife((s) => s.pomoRunning);
  const endsAt = useLife((s) => s.pomoEndsAt);
  const pomoRemaining = useLife((s) => s.pomoRemaining);
  const cycle = useLife((s) => s.pomoCycle);
  const pomoStart = useLife((s) => s.pomoStart);
  const pomoPause = useLife((s) => s.pomoPause);
  const pomoReset = useLife((s) => s.pomoReset);
  const pomoSkip = useLife((s) => s.pomoSkip);

  useTick(1000);

  const prevPhase = useRef(phase);
  const [donePrompt, setDonePrompt] = useState(false);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (prevPhase.current === "focus" && phase !== "focus") setDonePrompt(true);
    if (phase === "focus") setDonePrompt(false);
    prevPhase.current = phase;
  }, [phase]);

  const queue = useMemo(
    () =>
      [...tasks]
        .filter((t) => !t.done && !t.optional)
        .sort((a, b) => a.rank - b.rank),
    [tasks]
  );
  const activeTask = activeTaskId
    ? queue.find((t) => t.id === activeTaskId)
    : undefined;
  const topTask = activeTask ?? queue[0];
  const isManual = !!activeTask && activeTask.id !== queue[0]?.id;

  if (!hydrated)
    return (
      <div className="flex min-h-dvh items-center justify-center text-lux-faint">
        …
      </div>
    );

  const total =
    (phase === "focus"
      ? settings.focusLength
      : phase === "break"
      ? settings.breakLength
      : settings.longBreakLength) * 60;
  const remaining =
    running && endsAt
      ? Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      : pomoRemaining;
  const progress = total ? 1 - remaining / total : 0;
  const isFocus = phase === "focus";
  const prodScore = productivityScore(today, topTask ? false : true);

  const SET = 4;
  const pomoIndex = cycle + 1;
  const inSet = phase === "long" ? SET : cycle % SET;
  const toLong = phase === "long" ? SET : SET - (cycle % SET);

  const rhythmHint =
    phase === "long"
      ? "做满 4 个 · 长休息"
      : toLong === 1 && isFocus
      ? "这个之后就是长休息"
      : `再 ${toLong} 个进入长休息`;

  function markDone() {
    if (topTask) {
      toggleDone(topTask.id);
      setBurst((b) => b + 1);
      setDonePrompt(false);
    }
  }

  return (
    <div className="pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-lux-text">
          深度专注
        </h1>
        <p className="mt-1 text-sm text-lux-faint">一次只做眼前这一件事。</p>
      </header>

      {/* Just-finished-a-pomodoro prompt */}
      {donePrompt && topTask && (
        <div className="mb-4 rounded-2xl border border-lux-sage/40 bg-lux-sage/10 p-4 backdrop-blur-md">
          <p className="text-sm text-lux-text">
            🍅 一个番茄完成!「
            <span className="font-medium">{topTask.title}</span>」做完了吗?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={markDone}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-lux-bg transition-transform active:scale-[0.98]"
              style={{ backgroundImage: "var(--grad-sage)" }}
            >
              ✓ 做完了
            </button>
            <button
              onClick={() => setDonePrompt(false)}
              className="rounded-xl border border-lux-line/70 bg-lux-card/60 px-5 text-sm text-lux-dim"
            >
              还没,继续
            </button>
          </div>
        </div>
      )}

      {/* Editorial active task + card-wheel switcher */}
      <div className="mb-1">
        <p className="text-[10px] uppercase tracking-[0.3em] text-lux-amber">
          正在专注{isManual ? " · 手动" : ""}
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h2 className="min-w-0 flex-1 truncate text-[26px] font-semibold leading-tight tracking-tight text-lux-text">
            {topTask ? topTask.title : "自由专注"}
          </h2>
          {topTask && (
            <span className="numeric shrink-0 pb-1.5 text-xs text-lux-faint">
              {topTask.donePomodoros}/{topTask.pomodoros} 🍅
            </span>
          )}
        </div>
      </div>

      {queue.length > 0 ? (
        <TaskWheel
          tasks={queue.map((t) => ({
            id: t.id,
            title: t.title,
            done: t.donePomodoros,
            total: t.pomodoros,
          }))}
          activeId={topTask?.id}
          onSelect={(id) => setActiveTask(id)}
        />
      ) : (
        <p className="py-10 text-center text-sm text-lux-faint">
          今天的任务都完成了 🎉
        </p>
      )}

      {topTask && (
        <div className="mb-5 mt-1 flex items-center justify-center gap-2">
          <button
            onClick={markDone}
            className="inline-flex items-center gap-1.5 rounded-full border border-lux-sage/40 bg-lux-sage/10 px-4 py-1.5 text-xs font-medium text-lux-sage"
          >
            ✓ 这件做完了
          </button>
          {isManual && (
            <button
              onClick={() => setActiveTask(null)}
              className="inline-flex items-center rounded-full border border-lux-line/70 px-3 py-1.5 text-xs text-lux-faint"
            >
              回到默认顺序
            </button>
          )}
        </div>
      )}

      {/* Timer */}
      <div className="relative flex flex-col items-center">
        {burst > 0 && <Confetti key={burst} />}
        <span className="text-[11px] uppercase tracking-[0.3em] text-lux-faint">
          {isFocus
            ? `专注 · 今天第 ${pomoIndex} 个`
            : phase === "long"
            ? `长休息 · 下一个第 ${pomoIndex} 个`
            : `短休息 · 下一个第 ${pomoIndex} 个`}
        </span>

        <div className="mb-4 mt-3 flex items-center gap-2">
          <Burndown total={SET} done={inSet} active={isFocus ? inSet : undefined} />
          <span className="ml-1 text-[10px] text-lux-faint">{rhythmHint}</span>
        </div>

        <div className="relative">
          {running && (
            <div
              className="absolute inset-0 -z-10 animate-glow rounded-full blur-2xl"
              style={{ background: isFocus ? "var(--grad-focus)" : "var(--grad-sage)" }}
            />
          )}
          <PremiumRing
            progress={progress}
            size={236}
            stroke={15}
            from={isFocus ? "rgb(var(--lux-amber))" : "rgb(var(--lux-sage))"}
            to={isFocus ? "rgb(var(--lux-rose))" : "rgb(var(--lux-cyan))"}
          >
            <span className="numeric text-[3.2rem] font-light leading-none tracking-tight text-lux-text">
              {fmtDuration(remaining)}
            </span>
            <span className="mt-1.5 text-xs text-lux-faint">
              {isFocus ? `${settings.focusLength} 分钟专注` : "休息"}
            </span>
          </PremiumRing>
        </div>

        {!isFocus && (
          <p className="mt-3 text-xs text-lux-dim">
            还有{" "}
            <span className="numeric text-lux-text">{fmtDuration(remaining)}</span>{" "}
            开始今天第 {pomoIndex} 个番茄钟
          </p>
        )}

        <div className="mt-7 flex w-full gap-3">
          <button
            onClick={() => {
              if (running) {
                pomoPause();
              } else {
                primeAudio();
                ensureNotificationPermission();
                pomoStart();
              }
            }}
            className="flex-1 rounded-2xl py-3.5 text-sm font-semibold text-lux-bg shadow-[var(--lux-shadow)] transition-transform active:scale-[0.98]"
            style={{ backgroundImage: running ? "none" : "var(--grad-focus)" }}
          >
            <span className={running ? "text-lux-text" : ""}>
              {running ? "暂停" : "开始"}
            </span>
          </button>
          <button
            onClick={pomoSkip}
            className="rounded-2xl border border-lux-line/70 bg-lux-card/60 px-5 text-sm text-lux-dim backdrop-blur-md"
          >
            跳过
          </button>
          <button
            onClick={pomoReset}
            className="rounded-2xl border border-lux-line/70 bg-lux-card/60 px-5 text-sm text-lux-dim backdrop-blur-md"
          >
            重置
          </button>
        </div>
      </div>

      {/* Today stats */}
      <div className="mt-9 grid grid-cols-3 gap-3">
        <Stat label="完成番茄钟" value={String(today.pomodorosDone)} />
        <Stat label="专注分钟" value={String(today.focusMinutes)} />
        <Stat label="生产力分数" value={String(prodScore)} accent="amber" />
      </div>
    </div>
  );
}

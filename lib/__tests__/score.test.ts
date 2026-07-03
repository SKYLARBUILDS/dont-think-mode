import { describe, expect, it } from "vitest";
import { computeScore, dayScore, emptyDayLog, POINTS } from "../score";
import { Task } from "../types";

function mkTask(over: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "任务",
    rank: 1,
    pomodoros: 2,
    reason: "",
    deep: false,
    morning: false,
    revenue: false,
    product: false,
    health: false,
    optional: false,
    done: false,
    donePomodoros: 0,
    ...over,
  };
}

describe("dayScore — the single scoring formula", () => {
  it("scores an empty day as 0", () => {
    expect(dayScore(emptyDayLog("2026-01-01"), 0, false)).toBe(0);
  });

  it("credits pomodoros at 5 each", () => {
    const log = { ...emptyDayLog("2026-01-01"), pomodorosDone: 4 };
    expect(dayScore(log, 0, false)).toBe(4 * POINTS.pomodoro);
  });

  it("credits tasks at 8 each and the #1 task at +25", () => {
    const log = emptyDayLog("2026-01-01");
    expect(dayScore(log, 3, false)).toBe(3 * POINTS.taskDone);
    expect(dayScore(log, 3, true)).toBe(3 * POINTS.taskDone + POINTS.topTask);
  });

  it("credits every ritual with its documented points", () => {
    const log = {
      ...emptyDayLog("2026-01-01"),
      completedBlocks: ["morning-upgrade"],
      fitnessDone: true,
      sleptOnTime: true,
      danceDone: true,
    };
    expect(dayScore(log, 0, false)).toBe(
      POINTS.morningRoutine + POINTS.fitness + POINTS.sleepOnTime + POINTS.dance
    );
  });
});

describe("computeScore — live path derives from the task list", () => {
  it("matches dayScore given the equivalent counts", () => {
    const log = { ...emptyDayLog("2026-01-01"), pomodorosDone: 2 };
    const tasks = [
      mkTask({ id: "a", rank: 1, done: true }),
      mkTask({ id: "b", rank: 2, done: true }),
      mkTask({ id: "c", rank: 3, done: false }),
    ];
    expect(computeScore(log, tasks)).toBe(dayScore(log, 2, true));
  });

  it("no topTask bonus when #1 is unfinished", () => {
    const log = emptyDayLog("2026-01-01");
    const tasks = [
      mkTask({ id: "a", rank: 1, done: false }),
      mkTask({ id: "b", rank: 2, done: true }),
    ];
    expect(computeScore(log, tasks)).toBe(POINTS.taskDone);
  });
});

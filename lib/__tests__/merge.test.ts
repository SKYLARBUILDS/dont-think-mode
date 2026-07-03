import { describe, expect, it } from "vitest";
import { mergeHistories, mergeSnapshots, richness } from "../merge";
import { emptyDayLog } from "../score";
import { todayKey } from "../time";
import { DayLog } from "../types";

function day(date: string, over: Partial<DayLog> = {}): DayLog {
  return { ...emptyDayLog(date), ...over };
}

describe("mergeHistories — days can only be lost if neither side has them", () => {
  it("unions days present on only one side", () => {
    const a = [day("2026-01-03"), day("2026-01-01")];
    const b = [day("2026-01-02")];
    const merged = mergeHistories(a, b);
    expect(merged.map((d) => d.date)).toEqual([
      "2026-01-03",
      "2026-01-02",
      "2026-01-01",
    ]);
  });

  it("same date → the richer record wins regardless of side", () => {
    const rich = day("2026-01-01", { pomodorosDone: 6, score: 30 });
    const poor = day("2026-01-01", { pomodorosDone: 1, score: 5 });
    expect(richness(rich)).toBeGreaterThan(richness(poor));
    expect(mergeHistories([poor], [rich])[0].pomodorosDone).toBe(6);
    expect(mergeHistories([rich], [poor])[0].pomodorosDone).toBe(6);
  });

  it("exact tie → the preferred (newer) side wins", () => {
    const a = day("2026-01-01", { shiftMinutes: 11 });
    const b = day("2026-01-01", { shiftMinutes: 22 });
    expect(mergeHistories([a], [b])[0].shiftMinutes).toBe(11);
  });
});

describe("mergeSnapshots — the two-device disaster scenarios", () => {
  const base = {
    settings: { name: "S" },
    goals: [],
    tasks: [{ id: "n", title: "newer task" }],
    streak: 3,
  };

  it("a stale device pushing can no longer erase the other device's days", () => {
    // Newer side (about to win LWW) is MISSING two days the older side logged.
    const newer = { ...base, today: day(todayKey()), history: [day("2026-01-05")] };
    const older = {
      ...base,
      today: day("2026-01-04", { pomodorosDone: 3, score: 15 }),
      history: [day("2026-01-02", { score: 80 })],
    };
    const merged = mergeSnapshots(newer, older);
    const dates = [merged.today!.date, ...merged.history!.map((d) => d.date)];
    expect(dates).toContain("2026-01-05");
    expect(dates).toContain("2026-01-04"); // older's today survives as history
    expect(dates).toContain("2026-01-02");
  });

  it("same-day on both sides → the richer day wins and brings ITS task list", () => {
    const tk = todayKey();
    const newer = {
      ...base,
      today: day(tk, { pomodorosDone: 1 }),
      history: [] as DayLog[],
      tasks: [{ id: "n" }],
    };
    const older = {
      ...base,
      today: day(tk, { pomodorosDone: 7, score: 35 }),
      history: [] as DayLog[],
      tasks: [{ id: "o" }],
    };
    const merged = mergeSnapshots(newer, older);
    expect(merged.today!.pomodorosDone).toBe(7);
    expect((merged.tasks as { id: string }[])[0].id).toBe("o");
  });

  it("non-day fields always follow the newer side", () => {
    const newer = { ...base, streak: 9, today: day(todayKey()), history: [] as DayLog[] };
    const older = { ...base, streak: 2, today: day(todayKey()), history: [] as DayLog[] };
    expect(mergeSnapshots(newer, older).streak).toBe(9);
  });
});

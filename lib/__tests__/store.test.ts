import { beforeEach, describe, expect, it } from "vitest";
import { useLife } from "../store";
import { emptyDayLog, POINTS } from "../score";
import { todayKey } from "../time";
import { Task } from "../types";

function mkTask(over: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "任务A",
    rank: 1,
    pomodoros: 3,
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

function seed(tasks: Task[]) {
  useLife.setState({
    tasks,
    today: emptyDayLog(todayKey()),
    history: [],
    activeTaskId: null,
    streak: 0,
  });
}

beforeEach(() => {
  localStorage.clear();
  seed([]);
});

describe("toggleTaskDone — completing credits planned pomodoros, undo reverses exactly", () => {
  it("fills donePomodoros to the estimate and banks the delta into the day", () => {
    seed([mkTask({ pomodoros: 3, donePomodoros: 0 })]);
    useLife.getState().toggleTaskDone("t1");
    const s = useLife.getState();
    const t = s.tasks[0];
    expect(t.done).toBe(true);
    expect(t.donePomodoros).toBe(3);
    expect(t.creditedFromDone).toBe(3);
    expect(s.today.pomodorosDone).toBe(3);
    expect(s.today.focusMinutes).toBe(3 * s.settings.focusLength);
    // score = 1 task (which is rank 1) + 3 credited pomodoros
    expect(s.today.score).toBe(
      POINTS.taskDone + POINTS.topTask + 3 * POINTS.pomodoro
    );
  });

  it("only credits the gap when pomodoros were already run on the timer", () => {
    seed([mkTask({ pomodoros: 3, donePomodoros: 2 })]);
    useLife.setState({
      today: { ...useLife.getState().today, pomodorosDone: 2, focusMinutes: 50 },
    });
    useLife.getState().toggleTaskDone("t1");
    const s = useLife.getState();
    expect(s.tasks[0].creditedFromDone).toBe(1); // 3 planned − 2 run
    expect(s.today.pomodorosDone).toBe(3);
  });

  it("undo subtracts exactly what completion added — never the timer's work", () => {
    seed([mkTask({ pomodoros: 3, donePomodoros: 2 })]);
    useLife.setState({
      today: { ...useLife.getState().today, pomodorosDone: 2, focusMinutes: 50 },
    });
    useLife.getState().toggleTaskDone("t1"); // complete: +1 credit
    useLife.getState().toggleTaskDone("t1"); // undo
    const s = useLife.getState();
    expect(s.tasks[0].done).toBe(false);
    expect(s.tasks[0].donePomodoros).toBe(2); // timer work preserved
    expect(s.tasks[0].creditedFromDone).toBe(0);
    expect(s.today.pomodorosDone).toBe(2);
    expect(s.today.focusMinutes).toBe(50);
  });

  it("toggle twice is a no-op on the day counters (idempotent round-trip)", () => {
    seed([mkTask({ pomodoros: 4 })]);
    useLife.getState().toggleTaskDone("t1");
    useLife.getState().toggleTaskDone("t1");
    const s = useLife.getState();
    expect(s.today.pomodorosDone).toBe(0);
    expect(s.today.score).toBe(0);
  });
});

describe("ensureToday — day rollover", () => {
  it("banks the old day, carries unfinished, respawns recurring, drops done one-offs", () => {
    const oldDay = {
      ...emptyDayLog("2020-01-01"),
      pomodorosDone: 5,
      score: 80,
    };
    useLife.setState({
      today: oldDay,
      history: [],
      streak: 2,
      tasks: [
        mkTask({ id: "a", title: "没做完", rank: 1, done: false }),
        mkTask({ id: "b", title: "每日", rank: 2, done: true, recurring: true, donePomodoros: 2, creditedFromDone: 2 }),
        mkTask({ id: "c", title: "做完的一次性", rank: 3, done: true }),
      ],
    });
    useLife.getState().ensureToday();
    const s = useLife.getState();

    expect(s.today.date).toBe(todayKey());
    expect(s.history[0].date).toBe("2020-01-01");
    expect(s.history[0].score).toBe(80); // banked, frozen

    const ids = s.tasks.map((t) => t.id);
    expect(ids).toContain("a"); // unfinished carries
    expect(ids).toContain("b"); // recurring respawns
    expect(ids).not.toContain("c"); // finished one-off is gone

    const carried = s.tasks.find((t) => t.id === "a")!;
    expect(carried.carriedOver).toBe(true);
    const recurring = s.tasks.find((t) => t.id === "b")!;
    expect(recurring.done).toBe(false);
    expect(recurring.donePomodoros).toBe(0);
    expect(recurring.creditedFromDone).toBe(0); // must reset or later undo mis-credits

    expect(s.streak).toBe(3); // 80 ≥ 60 → streak continues
  });

  it("a day with no activity is NOT banked and breaks nothing", () => {
    useLife.setState({ today: emptyDayLog("2020-01-01"), history: [], streak: 4, tasks: [] });
    useLife.getState().ensureToday();
    const s = useLife.getState();
    expect(s.history.length).toBe(0);
    expect(s.streak).toBe(4); // untouched — absence isn't failure
  });
});

describe("history back-fill", () => {
  it("ensureHistoryDay creates a blank past day exactly once", () => {
    useLife.getState().ensureHistoryDay("2020-06-15");
    useLife.getState().ensureHistoryDay("2020-06-15");
    const s = useLife.getState();
    expect(s.history.filter((d) => d.date === "2020-06-15").length).toBe(1);
    expect(s.history[0].score).toBe(0);
  });

  it("toggleHistoryTask adds a title and rescores with the shared formula", () => {
    useLife.getState().ensureHistoryDay("2020-06-15");
    useLife.getState().toggleHistoryTask("2020-06-15", "补记的任务");
    let d = useLife.getState().history.find((h) => h.date === "2020-06-15")!;
    expect(d.completedTasks).toContain("补记的任务");
    expect(d.score).toBe(POINTS.taskDone);

    useLife.getState().toggleHistoryTask("2020-06-15", "补记的任务"); // remove
    d = useLife.getState().history.find((h) => h.date === "2020-06-15")!;
    expect(d.completedTasks).not.toContain("补记的任务");
    expect(d.score).toBe(0);
  });

  it("adjustHistoryDay rescores pomodoro bumps", () => {
    useLife.getState().ensureHistoryDay("2020-06-15");
    useLife.getState().adjustHistoryDay("2020-06-15", { pomodorosDone: 4 });
    const d = useLife.getState().history.find((h) => h.date === "2020-06-15")!;
    expect(d.score).toBe(4 * POINTS.pomodoro);
  });
});

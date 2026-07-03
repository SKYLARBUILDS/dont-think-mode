import { DayLog } from "./types";
import { todayKey } from "./time";
import { emptyDayLog } from "./score";

// ─────────────────────────────────────────────────────────────
// Snapshot merging for cloud sync.
//
// The sync payload is the whole app state as one blob, so naive
// last-write-wins silently deletes any day the losing device had
// logged. This module makes reconciliation a MERGE instead:
//   • days (today + history) are unioned by date — a day can only
//     be lost if neither side has it;
//   • when both sides have the same date, the record with more
//     logged activity ("richer") wins; ties go to the newer side;
//   • the day-state bundle (today + tasks + plan flags) travels
//     together, so a day's score never pairs with the other
//     side's task list;
//   • everything else (settings, goals, schedule, streak) is
//     plain LWW from the newer side.
// ─────────────────────────────────────────────────────────────

// The subset of the export payload's `data` object we merge over.
export interface SnapshotData {
  today?: DayLog;
  history?: DayLog[];
  tasks?: unknown[];
  activeTaskId?: unknown;
  planConfirmed?: unknown;
  aiSource?: unknown;
  sessions?: unknown[];
  [k: string]: unknown;
}

/** How much logged activity a day carries — used to pick between two
 *  records of the SAME date. Monotonic with "more got recorded". */
export function richness(d: DayLog): number {
  return (
    (d.pomodorosDone ?? 0) * 3 +
    (d.completedTasks?.length ?? 0) * 2 +
    (d.completedBlocks?.length ?? 0) +
    (d.score ?? 0) +
    (d.fitnessDone ? 1 : 0) +
    (d.danceDone ? 1 : 0) +
    (d.sleptOnTime ? 1 : 0)
  );
}

/** Union two day-lists by date. Duplicate dates → richer wins,
 *  tie → `preferred` wins. Returns newest-first. */
export function mergeHistories(
  preferred: DayLog[],
  other: DayLog[]
): DayLog[] {
  const byDate = new Map<string, DayLog>();
  for (const d of other) if (d?.date) byDate.set(d.date, d);
  for (const d of preferred) {
    if (!d?.date) continue;
    const existing = byDate.get(d.date);
    if (!existing || richness(d) >= richness(existing)) byDate.set(d.date, d);
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Merge two full snapshot `data` objects. `newer` is the side whose
 * updated_at won LWW — it supplies everything except days, which are
 * unioned. Returns a new data object safe to feed to importData.
 */
export function mergeSnapshots(
  newer: SnapshotData,
  older: SnapshotData
): SnapshotData {
  const newerDays = [newer.today, ...(newer.history ?? [])].filter(
    (d): d is DayLog => !!d?.date
  );
  const olderDays = [older.today, ...(older.history ?? [])].filter(
    (d): d is DayLog => !!d?.date
  );
  const all = mergeHistories(newerDays, olderDays);

  const tk = todayKey();
  const todayRec = all.find((d) => d.date === tk) ?? emptyDayLog(tk);
  const history = all.filter((d) => d.date !== tk);

  // The task list must pair with whoever's "today" record won — a score
  // computed from one side's tasks makes no sense next to the other's.
  const todayFromNewer =
    !!newer.today && newer.today.date === todayRec.date &&
    richness(newer.today) >= richness(todayRec);
  const daySide = todayFromNewer || !older.today ? newer : older;

  return {
    ...newer,
    today: todayRec,
    history,
    tasks: daySide.tasks ?? [],
    activeTaskId: daySide.activeTaskId ?? null,
    planConfirmed: daySide.planConfirmed ?? false,
    aiSource: daySide.aiSource ?? null,
    sessions: daySide.sessions ?? [],
  };
}

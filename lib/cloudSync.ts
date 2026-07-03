import { supabase } from "./supabase";
import { useLife } from "./store";
import { mergeSnapshots, SnapshotData } from "./merge";

// Cloud sync of the whole app state to a single Supabase row per user.
// Reconciliation is a MERGE, not naive last-write-wins: days logged on either
// device always survive (see lib/merge.ts); only day-independent fields
// (settings, goals, schedule) follow the newer side. After every reconcile the
// merged result is pushed back up, so the cloud row converges to the union.

const SYNCED_AT_KEY = "lifeos_synced_at";
let inFlight = false;
// While we're applying a remote snapshot, the store fires a few writes — don't
// echo those straight back up. Suppress pushes for a short window after apply.
let suppressPushUntil = 0;

function localSyncedAt(): string | null {
  try {
    return localStorage.getItem(SYNCED_AT_KEY);
  } catch {
    return null;
  }
}
function setLocalSyncedAt(at: string) {
  try {
    localStorage.setItem(SYNCED_AT_KEY, at);
  } catch {}
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Push the local state up. Records the SERVER's updated_at as our sync
 *  watermark — device clocks are not trusted for LWW decisions. */
export async function pushState(): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) return;
  const payload = JSON.parse(useLife.getState().exportData());
  const at = new Date().toISOString();
  const { data, error } = await supabase
    .from("app_state")
    .upsert({ user_id: uid, data: payload, updated_at: at })
    .select("updated_at")
    .maybeSingle();
  if (!error) setLocalSyncedAt((data?.updated_at as string) ?? at);
}

/** Unwrap an export payload ({app,version,data:{…}} or bare data). */
function unwrap(payload: unknown): SnapshotData | null {
  const p = payload as { data?: SnapshotData } | SnapshotData | null;
  if (!p || typeof p !== "object") return null;
  const d = (p as { data?: SnapshotData }).data ?? (p as SnapshotData);
  return d && typeof d === "object" ? d : null;
}

/**
 * Pull the remote row and reconcile by merging. Whichever side is newer wins
 * the day-independent fields; days are unioned so nothing logged is ever
 * silently dropped. The merged result is applied locally AND pushed back up.
 */
export async function pullAndReconcile(): Promise<"applied" | "pushed" | "noop"> {
  if (!supabase || inFlight) return "noop";
  const uid = await currentUserId();
  if (!uid) return "noop";
  inFlight = true;
  try {
    const { data, error } = await supabase
      .from("app_state")
      .select("data, updated_at")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) return "noop";

    if (!data) {
      await pushState(); // first sync — seed remote from local
      return "pushed";
    }

    const remote = unwrap(data.data);
    const local = unwrap(JSON.parse(useLife.getState().exportData()));
    if (!remote || !local) return "noop";

    const remoteAt = data.updated_at as string;
    const localAt = localSyncedAt();
    const remoteIsNewer = !localAt || remoteAt > localAt;

    const merged = remoteIsNewer
      ? mergeSnapshots(remote, local)
      : mergeSnapshots(local, remote);

    if (remoteIsNewer) {
      // Adopt the merge, then push the union back up so the cloud row has
      // every day from both sides.
      suppressPushUntil = Date.now() + 2500;
      useLife.getState().importData(JSON.stringify(merged));
      setLocalSyncedAt(remoteAt);
      await pushState();
      return "applied";
    }

    // Local is current or ahead — still adopt any remote-only days before
    // pushing, so a stale device's history can't be erased by this push.
    const localDayCount = 1 + (local.history?.length ?? 0);
    const mergedDayCount = 1 + (merged.history?.length ?? 0);
    if (mergedDayCount > localDayCount) {
      suppressPushUntil = Date.now() + 2500;
      useLife.getState().importData(JSON.stringify(merged));
    }
    await pushState();
    return "pushed";
  } finally {
    inFlight = false;
  }
}

/** True while we're still settling a just-applied remote snapshot. */
export function isPushSuppressed(): boolean {
  return Date.now() < suppressPushUntil;
}

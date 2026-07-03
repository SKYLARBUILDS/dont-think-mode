#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Don't Think Mode → Obsidian
// Turn a Life OS backup JSON into one daily-summary note per day,
// filed under <vault>/40_journal/life-os/YYYY-MM-DD.md.
//
// The app is local-first (browser localStorage). You export a JSON
// from the app (Settings → 数据备份 → 导出备份); on a phone that saves
// to Files / iCloud. This script reads the newest such file and
// renders Markdown into the Obsidian vault — no browser permissions.
//
// Usage:
//   node scripts/to-obsidian.mjs                 # newest backup → default vault
//   node scripts/to-obsidian.mjs path/to.json    # explicit backup file
//   LIFEOS_VAULT=/path/to/Vault node scripts/to-obsidian.mjs
//   LIFEOS_BACKUP_DIR=/path node scripts/to-obsidian.mjs   # override search dir
//
// Where it looks for backups (newest wins, across all):
//   1. iCloud Drive › LifeOS  (the phone's "Save to Files" drop folder)
//   2. ~/Downloads            (desktop browser exports)
//
// Notes:
//   • Writes ONLY into 40_journal/life-os/ — never touches your
//     hand-written daily notes in 40_journal/daily/.
//   • Idempotent: re-running overwrites the same dated notes.
//   • Sessions reset on day rollover, so the per-pomodoro list and
//     finished-task titles appear on the *today* note only; past
//     days show the banked DayLog stats.
// ─────────────────────────────────────────────────────────────

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const HOME = os.homedir();
const VAULT = process.env.LIFEOS_VAULT || path.join(HOME, "Desktop", "Skylar");
const OUT_DIR = path.join(VAULT, "40_journal", "life-os");
const ICLOUD_ROOT = path.join(
  HOME,
  "Library",
  "Mobile Documents",
  "com~apple~CloudDocs"
);
const ICLOUD = path.join(ICLOUD_ROOT, "LifeOS");
const DOWNLOADS = path.join(HOME, "Downloads");

// WeChat 文件传输助手 drop: files sent from the phone land in month folders
// under …/xwechat_files/<wxid>/msg/file/YYYY-MM/. Scan the recent months so
// "export on phone → send to 文件传输助手" syncs with zero extra steps.
function wechatFileDirs() {
  const base = path.join(
    HOME,
    "Library",
    "Containers",
    "com.tencent.xinWeChat",
    "Data",
    "Documents",
    "xwechat_files"
  );
  const dirs = [];
  try {
    for (const wxid of fs.readdirSync(base)) {
      const fileRoot = path.join(base, wxid, "msg", "file");
      if (!fs.existsSync(fileRoot)) continue;
      const now = new Date();
      for (const back of [0, 1]) {
        const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthDir = path.join(fileRoot, ym);
        if (fs.existsSync(monthDir)) dirs.push(monthDir);
      }
    }
  } catch {
    /* WeChat not installed / no permission — skip */
  }
  return dirs;
}

// Scan the iCloud Drive root too — iOS "Save to Files" often drops the export
// there rather than inside the LifeOS subfolder, and we don't want to miss it.
const SEARCH_DIRS = process.env.LIFEOS_BACKUP_DIR
  ? [process.env.LIFEOS_BACKUP_DIR]
  : [ICLOUD, ICLOUD_ROOT, DOWNLOADS, ...wechatFileDirs()];

function die(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

// iCloud can keep a file "dataless" (in the cloud, not on disk); reading it then
// fails with "Unknown system error -11". Ask iCloud to materialize it, then wait
// briefly for the bytes to land.
function tryMaterialize(f) {
  try {
    execSync(`/usr/bin/brctl download ${JSON.stringify(f)}`, {
      stdio: "ignore",
      timeout: 20000,
    });
  } catch {
    /* brctl may be unavailable or already downloading — ignore */
  }
  for (let i = 0; i < 12; i++) {
    try {
      const raw = fs.readFileSync(f, "utf8");
      if (raw.length > 0) return raw;
    } catch {
      /* not ready yet */
    }
    try {
      execSync("sleep 1");
    } catch {}
  }
  return null;
}

function readValidBackup(f) {
  let raw;
  try {
    raw = fs.readFileSync(f, "utf8");
  } catch {
    raw = tryMaterialize(f); // likely an iCloud placeholder
  }
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const data = parsed?.data ?? parsed;
  if (!data || typeof data !== "object" || !Array.isArray(data.history))
    return null;
  return data;
}

// ── 1+2. Locate + parse: newest backup that actually reads & validates ───
function locateBackup() {
  const explicit = process.argv[2];
  if (explicit) {
    if (!fs.existsSync(explicit)) die(`找不到文件：${explicit}`);
    const d = readValidBackup(explicit);
    if (!d) die(`无法读取/解析：${explicit}`);
    return { file: explicit, data: d };
  }
  const candidates = SEARCH_DIRS.filter((d) => fs.existsSync(d))
    .flatMap((dir) =>
      fs
        .readdirSync(dir)
        .filter((f) => /^life-os-.*\.json$/i.test(f))
        .map((f) => {
          const full = path.join(dir, f);
          return { full, mtime: fs.statSync(full).mtimeMs };
        })
    )
    .sort((a, b) => b.mtime - a.mtime);
  if (candidates.length === 0)
    die(
      `没找到 life-os-*.json 备份。找过这些位置：\n` +
        SEARCH_DIRS.map((d) => `  · ${d}`).join("\n") +
        `\n手机上：打开 App → 设置 → 数据备份 →「↓ 导出备份」→ 存到 iCloud。`
    );
  // Newest first; skip any that can't be read/parsed (e.g. still-uploading).
  for (const c of candidates) {
    const d = readValidBackup(c.full);
    if (d) return { file: c.full, data: d };
  }
  die(
    `找到 ${candidates.length} 份备份但都读不了(可能 iCloud 还没下载完)。最新：${candidates[0].full}`
  );
}

const { file, data } = locateBackup();

const schedule = Array.isArray(data.schedule) ? data.schedule : [];
const blockTitle = new Map(schedule.map((b) => [b.id, b.title]));
const today = data.today && data.today.date ? data.today : null;
const history = data.history.filter((d) => d && d.date);
const sessions = Array.isArray(data.sessions) ? data.sessions : [];
const tasks = Array.isArray(data.tasks) ? data.tasks : [];
const streak = Number.isFinite(data.streak) ? data.streak : null;

// ── 3. Render one note per day ──────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
const clock = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const check = (ok) => (ok ? "✓" : "—");

function renderDay(day, isToday) {
  const doneBlocks = (day.completedBlocks || [])
    .map((id) => blockTitle.get(id))
    .filter(Boolean);

  const fm = [
    "---",
    `date: ${day.date}`,
    "source: dont-think-mode",
    `score: ${day.score ?? 0}`,
    `pomodoros: ${day.pomodorosDone ?? 0}`,
    `focus_minutes: ${day.focusMinutes ?? 0}`,
    isToday && streak != null ? `streak: ${streak}` : null,
    "tags: [life-os/daily]",
    "---",
  ].filter((l) => l != null);

  const lines = [...fm, ""];
  lines.push(`# ${day.date} · Life OS 小结`);
  lines.push("");
  const streakTxt =
    isToday && streak != null ? ` · 🔥 连续 ${streak} 天达标` : "";
  lines.push(`**得分 ${day.score ?? 0}**${streakTxt}`);
  lines.push("");

  // What got finished
  const doneTasks = isToday ? tasks.filter((t) => t.done) : [];
  if (doneBlocks.length || doneTasks.length) {
    lines.push("## 完成");
    for (const t of doneBlocks) lines.push(`- ✓ ${t}`);
    for (const t of doneTasks) lines.push(`- ✓ ~~${t.title}~~`);
    lines.push("");
  }

  // Today's pomodoro log (sessions exist for today only)
  if (isToday) {
    const todays = sessions
      .filter((s) => s.completedAt && sameDay(s.startedAt, day.date))
      .sort((a, b) => a.startedAt - b.startedAt);
    if (todays.length) {
      lines.push("## 今日番茄");
      for (const s of todays)
        lines.push(`- ${clock(s.startedAt)} · ${s.taskTitle || "专注"}`);
      lines.push("");
    }
  }

  // Stats + daily checks
  lines.push("## 数据");
  lines.push(`- 番茄钟：${day.pomodorosDone ?? 0} 个`);
  lines.push(`- 专注时长：${day.focusMinutes ?? 0} 分钟`);
  lines.push(
    `- 健身 ${check(day.fitnessDone)} · 跳舞 ${check(day.danceDone)} · ` +
      `晨间养护 ${check(day.beautyDone)} · 准时睡觉 ${check(day.sleptOnTime)}`
  );
  lines.push("");

  return lines.join("\n");
}

function sameDay(ms, dateStr) {
  const d = new Date(ms);
  const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return key === dateStr;
}

// ── 4. Write ────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });

const days = [];
// Only write today if it actually has activity, mirroring the app's
// rollover rule (no empty placeholder notes).
if (
  today &&
  (today.pomodorosDone > 0 ||
    (today.completedBlocks || []).length > 0 ||
    today.score > 0)
)
  days.push([today, true]);
for (const d of history) days.push([d, false]);

let written = 0;
for (const [day, isToday] of days) {
  const out = path.join(OUT_DIR, `${day.date}.md`);
  fs.writeFileSync(out, renderDay(day, isToday), "utf8");
  written++;
}

const rel = path.relative(HOME, OUT_DIR).replace(/^/, "~/");
console.log(`\n✓ 导出 ${written} 天小结 → ${rel}`);
console.log(`  来源备份：${path.relative(HOME, file).replace(/^/, "~/")}\n`);

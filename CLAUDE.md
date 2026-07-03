# Skylar Life OS — "Don't Think Mode"

## What this is
Personal life-OS PWA for ADHD-brain execution: instead of another todo organizer, it shows
**one thing — what's happening NOW and how much time is left**. A fixed daily rhythm of time
blocks (wake → routine → work → meal → fitness → winddown → sleep) drives a live countdown
ring, an always-running pomodoro engine, AI task sorting, and an end-of-day score → streak
loop. Solo-founder personal product by Skylar; bilingual (README.md = EN, README.zh-CN.md = 中文).

## Tech stack
- Next.js 14 (App Router) + TypeScript strict + Tailwind
- Zustand + `persist` middleware — **local-first**, no account required
- Optional Supabase cloud sync (email+password auth; keys in `.env.local`)
- framer-motion for animation; PWA (service worker via `components/RegisterSW.tsx`)
- Capacitor 8 iOS shell (`capacitor.config.ts`, `scripts/build-capacitor.sh`)

## Run dev
```bash
npm run dev        # next dev -p 4318  →  http://localhost:4318
```
Other scripts: `npm run build` / `start` (also port 4318) / `lint` / `obsidian` (export via `scripts/to-obsidian.mjs`).

## Where things live
- `lib/types.ts` — **domain model** (TimeBlock, BlockType, GoalTier…; times = minutes-from-midnight)
- `lib/store.ts` — single Zustand store `useLife` (create + persist). All state mutations go
  through here. Contains **versioned migrations** for users persisted before newer features
  (editable schedule, auto-backup, theme, nightly backup) — when adding persisted fields,
  add a migration default the same way.
- `lib/` — schedule.ts (timeline packing), score.ts, ai.ts, cloudSync.ts, backup.ts,
  notifications.ts, shareCard.ts, demoData.ts
- `app/` — routes: plan, pomodoro, schedule, review, goals, fitness, input, settings, privacy
- `app/api/` — `sort` (AI task sorting) + `transcribe`. These are the ONLY server routes.
- `components/` — PomoEngine, DayTimeline, CloudSync, BottomNav, Ring, etc.
- **`app/pro/**` + `components/pro/**` — the PREMIUM "/pro" UI** (Apple/Figma-tier, framer-motion,
  bespoke SVG data-viz, both dark "夜间豪华" + light "Apple 清透"). It's a parallel route tree that
  SHARES the same `lib/` + `useLife` store — the classic `app/` routes are the preserved version.
  Reached at `/pro` (Settings has a "✨ 试试新版界面" link; pro Settings has "← 回到经典版"). Key
  rules: it's a NESTED segment so the root layout's singletons (PomoEngine/CloudSync/…) serve both
  trees — `app/pro/layout.tsx` mounts NONE of them. Premium tokens are scoped under `.pro` /
  `.light .pro` in globals.css and `lux.*` in tailwind (additive — never touch classic tokens).
  `BottomNav` returns null on `/pro`. Page transitions live in `app/pro/template.tsx`.
  UI copy is all Chinese. Aesthetic = clean near-black editorial (a single restrained
  top glow, NO ambient particle field — `FlowField.tsx` exists but is intentionally
  unused, judged too busy). Signature interaction = `components/pro/TaskWheel.tsx`, a
  polaroid card "wheel" (CRL-style) for switching the focused task: centered card
  upright, neighbors arced/tilted, drag to rotate (logic reads a dragRef, not state, so
  the snap is timing-safe). Heroes use ONE `PremiumRing` (the earlier 3-ring
  ActivityRings was dropped as confusing). NOTE: bg layers use low POSITIVE z-index with
  content lifted to `z-10` — negative z + `position:fixed` renders behind the body's
  opaque bg in some engines. Default schedule block titles are Chinese, with a one-time
  English→Chinese migration in `store.ts`.

## State conventions
- Local-first: everything works without network/account; Supabase sync is opt-in layered on top.
- One global store (`useLife`); derived helpers in `lib/hooks.ts`. Don't add a second store.

## Feature-complete vs WIP (from git log, as of 2026-06-10)
Done: core block timeline + pomodoro + score/streak; Supabase cloud sync with email+password
auth + auto-save; demo mode (Chinese sample data, demo clock pinned 2:30 PM); end-of-pomodoro
"mark done" prompt; alarm-style end chime + notification permission flow; day share card
(card archive); priority reorder (tap-number positioning, 一键置顶, timeline follows plan
priority); per-task progress bar + recurring daily tasks (latest commit).
WIP/rough edges: iOS Capacitor distribution (app-store icon exists, no `ios/` checked in here);
fitness/goals pages less iterated than plan/pomodoro.

## Deployment — important
**NOT publicly launched.** A Vercel project (`skylar-life-os`) is linked in `.vercel/` — the
Capacitor build script uses `https://skylar-life-os.vercel.app` as API base for the native
shell — but treat this as private infrastructure. **Do not deploy, publish, or push releases
without Skylar's explicit go-ahead.** Local edits only by default.

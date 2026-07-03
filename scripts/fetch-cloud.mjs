#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Pull the latest Life OS state straight from Supabase cloud sync,
// so the Obsidian pipeline no longer depends on manual JSON exports.
//
// Auth: signs in with the same email+password used in the app's
// 设置 → 云同步. Credentials live in ~/.lifeos-sync.env (chmod 600):
//   LIFEOS_SYNC_EMAIL=you@example.com
//   LIFEOS_SYNC_PASSWORD=…
// Supabase URL/key are read from the project's .env.local.
//
// On success prints the path of a fresh JSON snapshot (same shape as
// the app's exported backup) and exits 0. Any failure → exit 1 with a
// message, so the caller can fall back to local backup files.
// ─────────────────────────────────────────────────────────────

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HOME = os.homedir();
const PROJ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvFile(p) {
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const proj = parseEnvFile(path.join(PROJ, ".env.local"));
const creds = parseEnvFile(path.join(HOME, ".lifeos-sync.env"));

const url = proj.NEXT_PUBLIC_SUPABASE_URL;
const key = proj.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = creds.LIFEOS_SERVICE_KEY;
const email = creds.LIFEOS_SYNC_EMAIL;
const password = creds.LIFEOS_SYNC_PASSWORD;

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!url || !key) die("缺少 Supabase 配置(.env.local)");

let rows, qErr;
if (serviceKey) {
  // Owner path: the project's service key bypasses RLS — no user login needed.
  // Personal project → grab the most recently updated state row.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  ({ data: rows, error: qErr } = await admin
    .from("app_state")
    .select("data, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1));
} else if (email && password) {
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authErr } =
    await supabase.auth.signInWithPassword({ email, password });
  if (authErr || !auth?.user)
    die(`云同步登录失败:${authErr?.message ?? "unknown"}`);
  ({ data: rows, error: qErr } = await supabase
    .from("app_state")
    .select("data, updated_at")
    .eq("user_id", auth.user.id)
    .limit(1));
} else {
  die("缺少凭据(~/.lifeos-sync.env 里填 LIFEOS_SERVICE_KEY,或邮箱+密码)");
}

if (qErr) die(`读取云端数据失败:${qErr.message}`);
if (!rows || rows.length === 0 || !rows[0].data) die("云端还没有数据(app 里登录云同步后会自动上传)");

const snapshot = rows[0].data; // exportData() shape: {app, version, data:{…}} or bare data
const outDir = path.join(HOME, "Library", "Caches", "lifeos");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "life-os-cloud.json");
fs.writeFileSync(
  outFile,
  typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot),
  "utf8"
);

// stdout = the snapshot path (consumed by obsidian-sync.sh)
console.log(outFile);

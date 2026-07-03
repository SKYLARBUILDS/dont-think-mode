import { NextRequest, NextResponse } from "next/server";

// Shared guards for the two API routes. Keys are user-supplied so the routes
// can't leak OUR money — the risk is third-party sites proxying through our
// deployment (burning Vercel quota) and oversized bodies. Both are cheap to
// block at the edge.

const ORIGIN_ALLOWLIST = new Set([
  "https://skylar-life-os.vercel.app",
  "https://skylar-life-os-pro.vercel.app",
  "https://life.skylarnyc.com",
  // Capacitor iOS shell (static-export build loads from a local origin)
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
]);

/** Browser calls must come from our own origins. Requests WITHOUT an Origin
 *  header (curl, native shells, same-origin GET) pass — they can't ride a
 *  victim's browser session, and they bring their own API key. */
export function originDenied(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  if (ORIGIN_ALLOWLIST.has(origin)) return null;
  try {
    const o = new URL(origin);
    const host = req.headers.get("host");
    if (host && o.host === host) return null; // same-origin, any deployment URL
    if (o.hostname === "localhost" || o.hostname === "127.0.0.1") return null;
    if (o.hostname.endsWith(".vercel.app") && o.hostname.startsWith("skylar-life-os"))
      return null; // preview deployments
  } catch {
    /* malformed origin → deny */
  }
  return NextResponse.json({ error: "origin not allowed" }, { status: 403 });
}

// Best-effort in-memory rate limit. Edge isolates don't share memory, so this
// is a speed bump, not a wall — good enough for a personal app with
// user-supplied keys. (A shared limiter would need Upstash/KV.)
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

export function rateLimited(req: NextRequest): NextResponse | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const arr = (hits.get(ip) ?? []).filter((t) => t > windowStart);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // crude memory cap
  if (arr.length > MAX_PER_WINDOW) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  return null;
}

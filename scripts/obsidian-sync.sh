#!/bin/bash
# Wrapper so launchd (which runs with a bare PATH) can find node.
NODE="$(command -v node 2>/dev/null || true)"
# Fall back to the newest nvm-installed node (survives version bumps).
[ -x "$NODE" ] || NODE="$(ls -t "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | head -1)"
[ -x "$NODE" ] || { echo "✗ 找不到 node" >&2; exit 1; }

DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Prefer the LIVE cloud-sync state (Supabase) — no manual export needed.
# fetch-cloud.mjs prints the snapshot path on success; on any failure we
# fall back to the newest local life-os-*.json backup (old behavior).
CLOUD_JSON="$("$NODE" "$DIR/scripts/fetch-cloud.mjs" 2>/tmp/lifeos-cloud-fetch.err)"
if [ -n "$CLOUD_JSON" ] && [ -f "$CLOUD_JSON" ]; then
  echo "☁️  使用云端最新数据"
  exec "$NODE" "$DIR/scripts/to-obsidian.mjs" "$CLOUD_JSON"
fi

echo "⚠️  云端拉取失败,退回本地备份 ($(tail -1 /tmp/lifeos-cloud-fetch.err 2>/dev/null))"
exec "$NODE" "$DIR/scripts/to-obsidian.mjs" "$@"

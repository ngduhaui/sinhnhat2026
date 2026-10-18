#!/bin/sh
# Bring the app back up after a restart, plus the free public URL.
#
# Works in the platform sandbox (/workspace, port 8080) and on a local machine
# where port 8080 is already taken (falls back to 3000).
set -eu

if [ -d /workspace ]; then
  cd /workspace
else
  cd "$(dirname "$0")"
fi

PORT="${PORT:-8080}"
if ! curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/" 2>/dev/null; then
  if netstat -ano 2>/dev/null | grep -q ":$PORT .*LISTENING"; then
    PORT=3000
  fi
fi

if ! curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/"; then
  PUBLIC_TUNNEL=1 npm run dev -- --port "$PORT" >>/tmp/app-startup.log 2>&1 &
fi

# Public URL (Cloudflare quick tunnel — free, no account).
if [ -x .tools/cloudflared.exe ] || command -v cloudflared >/dev/null 2>&1; then
  sh scripts/public.sh >/dev/null 2>&1 || true
fi

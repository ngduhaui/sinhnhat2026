#!/bin/sh
# Bring the app up locally and expose it on a free public HTTPS URL.
#
#   sh scripts/public.sh
#
# Prints the public URL at the end. The URL is a Cloudflare "quick tunnel":
# free, no account, but it changes every time the tunnel restarts.
set -eu
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
TUNNEL_LOG=".tools/tunnel.log"
URL_FILE=".tools/public-url.txt"
mkdir -p .tools screenshots

# 1. Dev server (port 8080 may be taken on this machine, hence $PORT).
if ! curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/"; then
  echo "starting dev server on :$PORT"
  PUBLIC_TUNNEL=1 nohup node scripts/with-app-env.mjs vite dev --host 0.0.0.0 --port "$PORT" \
    > .tools/dev.log 2>&1 &
  i=0
  until curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/"; do
    i=$((i + 1))
    [ "$i" -gt 60 ] && { echo "dev server did not come up; see .tools/dev.log"; exit 1; }
    sleep 1
  done
fi
echo "local: http://127.0.0.1:$PORT/"

# 2. Quick tunnel (download the binary once).
if [ ! -x .tools/cloudflared.exe ]; then
  echo "downloading cloudflared…"
  curl -L --retry 5 -C - -o .tools/cloudflared.exe \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
fi

if ! grep -q "trycloudflare.com" "$URL_FILE" 2>/dev/null || \
   ! curl -sf -o /dev/null --max-time 8 "$(cat "$URL_FILE" 2>/dev/null || echo http://127.0.0.1:1)/"; then
  rm -f "$TUNNEL_LOG" "$URL_FILE"
  ./.tools/cloudflared.exe tunnel --url "http://127.0.0.1:$PORT" --no-autoupdate \
    > "$TUNNEL_LOG" 2>&1 &
  i=0
  until grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" > "$URL_FILE" 2>/dev/null; do
    i=$((i + 1))
    [ "$i" -gt 60 ] && { echo "tunnel did not start; see $TUNNEL_LOG"; exit 1; }
    sleep 1
  done
fi

echo "public: $(cat "$URL_FILE")"

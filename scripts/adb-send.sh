#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Build the offline letter and push it to an Android phone over USB (adb),
#  then launch it inside Termux.
#
#  Usage (macOS / Linux / Git Bash):
#      bash scripts/adb-send.sh
#      ADB_SERIAL=R58M123ABC bash scripts/adb-send.sh
#      SKIP_BUILD=1 bash scripts/adb-send.sh
# ---------------------------------------------------------------------------
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE="$ROOT/dist/phone/index.html"
DEVICE_DIR="/sdcard/Download/la-thu-sinh-nhat"
SERIAL_ARGS=()
[ -n "${ADB_SERIAL:-}" ] && SERIAL_ARGS=(-s "$ADB_SERIAL")

say() { printf '\033[36m%s\033[0m\n' "$*"; }
ok() { printf '\033[32m  OK: %s\033[0m\n' "$*"; }
warn() { printf '\033[33m  ! %s\033[0m\n' "$*"; }
fail() { printf '\033[31m  x %s\033[0m\n' "$*"; exit 1; }

say "1/5  Kiem tra adb..."
command -v adb >/dev/null 2>&1 || fail "Chua co adb (Android Platform Tools)."
DEVICES="$(adb "${SERIAL_ARGS[@]}" devices | awk '$2 == "device" {print $1}')"
[ -n "$DEVICES" ] || fail "Khong thay dien thoai. Bat USB debugging va bam 'Cho phep go loi'."
ok "$DEVICES"

say "2/5  Build ban offline (1 file HTML)..."
if [ "${SKIP_BUILD:-0}" != "1" ]; then
  ( cd "$ROOT" && node scripts/build-phone.mjs ) || fail "Build that bai."
fi
[ -f "$BUNDLE" ] || fail "Khong thay $BUNDLE"
ok "index.html ($(( $(wc -c < "$BUNDLE") / 1024 )) KB)"

say "3/5  Chep sang dien thoai ($DEVICE_DIR)..."
adb "${SERIAL_ARGS[@]}" shell "mkdir -p '$DEVICE_DIR'"
adb "${SERIAL_ARGS[@]}" push "$BUNDLE" "$DEVICE_DIR/index.html" >/dev/null
adb "${SERIAL_ARGS[@]}" push "$ROOT/phone/termux-serve.sh" "$DEVICE_DIR/termux-serve.sh" >/dev/null
adb "${SERIAL_ARGS[@]}" push "$ROOT/phone/README.md" "$DEVICE_DIR/README.md" >/dev/null
ok "da chep 3 file"

say "4/5  Cai shortcut trong Termux..."
if adb "${SERIAL_ARGS[@]}" shell "pm list packages com.termux" | grep -q com.termux; then
  if adb "${SERIAL_ARGS[@]}" shell \
    "run-as com.termux sh -c 'mkdir -p files/home/.shortcuts && cp /sdcard/Download/la-thu-sinh-nhat/termux-serve.sh files/home/.shortcuts/la-thu.sh && chmod 700 files/home/.shortcuts/la-thu.sh && cp /sdcard/Download/la-thu-sinh-nhat/index.html files/home/la-thu.html'" 2>/dev/null; then
    ok "~/.shortcuts/la-thu.sh"
  else
    warn "Khong tao duoc shortcut; dung lenh thu cong ben duoi."
  fi
else
  warn "Termux chua duoc cai (F-Droid: com.termux)."
fi

say "5/5  Mo Termux va chay la thu..."
adb "${SERIAL_ARGS[@]}" shell "am start -n com.termux/.app.TermuxActivity" >/dev/null 2>&1
sleep 1
adb "${SERIAL_ARGS[@]}" shell \
  "am startservice --user 0 -n com.termux/com.termux.app.RunCommandService -a com.termux.RUN_COMMAND \
   --es com.termux.RUN_COMMAND_PATH '/data/data/com.termux/files/usr/bin/bash' \
   --esa com.termux.RUN_COMMAND_ARGUMENTS '/data/data/com.termux/files/home/.shortcuts/la-thu.sh' \
   --ez com.termux.RUN_COMMAND_BACKGROUND false" >/dev/null 2>&1

cat <<'EOF'

Xong. Tren dien thoai:

  * Neu Termux tu mo va hien la thu  -> doc ngay.
  * Neu chua chay, mo Termux va dan:

        bash ~/.shortcuts/la-thu.sh

  * Khong cai Termux? Mo app Quan ly file > Download > la-thu-sinh-nhat >
    cham index.html de mo bang Chrome.

EOF

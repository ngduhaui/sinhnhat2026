# ---------------------------------------------------------------------------
#  Build the offline letter and push it to an Android phone over USB (adb),
#  then launch it inside Termux.
#
#  Usage (from the project root, PowerShell):
#      powershell -ExecutionPolicy Bypass -File scripts/adb-send.ps1
#      powershell -ExecutionPolicy Bypass -File scripts/adb-send.ps1 -Serial R58M123ABC
# ---------------------------------------------------------------------------
param(
  [string]$Serial = "",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$bundle = Join-Path $root "dist\phone\index.html"
$deviceDir = "/sdcard/Download/la-thu-sinh-nhat"

function Fail($msg) {
  Write-Host "  x $msg" -ForegroundColor Red
  exit 1
}

Write-Host "`n1/5  Kiem tra adb..." -ForegroundColor Cyan
if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
  Fail "Chua co adb. Cai Android Platform Tools: https://developer.android.com/tools/releases/platform-tools"
}

$adbArgs = @()
if ($Serial) { $adbArgs += @("-s", $Serial) }

$devices = (& adb @adbArgs devices) | Select-String -Pattern "\sdevice$"
if (-not $devices) {
  Write-Host "  Khong thay dien thoai nao." -ForegroundColor Yellow
  Write-Host "  - Bat 'USB debugging' trong Tuy chon nha phat trien"
  Write-Host "  - Cam cap USB, bam 'Cho phep go loi' tren man hinh dien thoai"
  exit 1
}
Write-Host "  OK: $($devices -join ', ')" -ForegroundColor Green

Write-Host "`n2/5  Build ban offline (1 file HTML)..." -ForegroundColor Cyan
if (-not $SkipBuild) {
  Push-Location $root
  try {
    node scripts/build-phone.mjs
    if ($LASTEXITCODE -ne 0) { Fail "Build that bai." }
  } finally {
    Pop-Location
  }
}
if (-not (Test-Path $bundle)) { Fail "Khong thay $bundle" }
$kb = [math]::Round((Get-Item $bundle).Length / 1KB)
Write-Host "  OK: index.html ($kb KB)" -ForegroundColor Green

Write-Host "`n3/5  Chep sang dien thoai ($deviceDir)..." -ForegroundColor Cyan
& adb @adbArgs shell "mkdir -p '$deviceDir'"
& adb @adbArgs push $bundle "$deviceDir/index.html"
& adb @adbArgs push (Join-Path $root "phone\termux-serve.sh") "$deviceDir/termux-serve.sh"
& adb @adbArgs push (Join-Path $root "phone\README.md") "$deviceDir/README.md"
if ($LASTEXITCODE -ne 0) { Fail "adb push that bai." }
Write-Host "  OK" -ForegroundColor Green

Write-Host "`n4/5  Cai shortcut trong Termux..." -ForegroundColor Cyan
$termuxInstalled = (& adb @adbArgs shell "pm list packages com.termux") -match "com.termux"
if (-not $termuxInstalled) {
  Write-Host "  Termux chua duoc cai. Cai tu F-Droid: https://f-droid.org/packages/com.termux/" -ForegroundColor Yellow
} else {
  # /sdcard khong ho tro chmod, nen chep ban chay duoc vao HOME cua Termux.
  & adb @adbArgs shell "run-as com.termux sh -c 'mkdir -p files/home/.shortcuts && cp /sdcard/Download/la-thu-sinh-nhat/termux-serve.sh files/home/.shortcuts/la-thu.sh && chmod 700 files/home/.shortcuts/la-thu.sh && cp /sdcard/Download/la-thu-sinh-nhat/index.html files/home/la-thu.html'" 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: ~/.shortcuts/la-thu.sh" -ForegroundColor Green
  } else {
    Write-Host "  Khong tao duoc shortcut (app debug khong cho run-as). Dung lenh thu cong ben duoi." -ForegroundColor Yellow
  }
}

Write-Host "`n5/5  Mo Termux va chay la thu..." -ForegroundColor Cyan
# Termux RUN_COMMAND can "allow-external-apps=true" in ~/.termux/termux.properties.
& adb @adbArgs shell "am start -n com.termux/.app.TermuxActivity" 2>$null | Out-Null
Start-Sleep -Milliseconds 1200
& adb @adbArgs shell "am startservice --user 0 -n com.termux/com.termux.app.RunCommandService -a com.termux.RUN_COMMAND --es com.termux.RUN_COMMAND_PATH '/data/data/com.termux/files/usr/bin/bash' --esa com.termux.RUN_COMMAND_ARGUMENTS '/data/data/com.termux/files/home/.shortcuts/la-thu.sh' --ez com.termux.RUN_COMMAND_BACKGROUND false" 2>$null | Out-Null

Write-Host @"

Xong. Tren dien thoai:

  * Neu Termux tu mo va hien la thu  -> doc ngay.
  * Neu chua chay, mo Termux va dan:

        bash ~/.shortcuts/la-thu.sh

  * Khong cai Termux? Mo app Quan ly file > Download > la-thu-sinh-nhat >
    cham index.html de mo bang Chrome.

"@ -ForegroundColor Green

#!/usr/bin/env bash
# Install Golden Bridge + runtime launchd jobs on LAB 8GB (run once on the LAB machine).
set -euo pipefail

LAB_ROOT="${LAB_ROOT:-/Lab}"
UI_ROOT="${LAB_ROOT}/src/Dream-Machine-Processual-UI"
ENV_FILE="${LAB_ROOT}/env/runtime.env"
UID_NUM="$(id -u)"
AGENTS_DIR="${HOME}/Library/LaunchAgents"

chmod +x "${UI_ROOT}/scripts/golden-bridge/run-hourly.sh"
chmod +x "${UI_ROOT}/scripts/golden-bridge/run-daily.sh"
chmod +x "${UI_ROOT}/scripts/deploy-lab-runtime.sh"

mkdir -p "$AGENTS_DIR" "${LAB_ROOT}/logs"

write_interval_plist() {
  local label="$1"
  local script="$2"
  local interval="$3"
  local path="${AGENTS_DIR}/${label}.plist"
  cat >"$path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>LAB_ROOT=${LAB_ROOT} ${script}</string>
  </array>
  <key>StartInterval</key>
  <integer>${interval}</integer>
  <key>StandardOutPath</key>
  <string>${LAB_ROOT}/logs/${label}.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${LAB_ROOT}/logs/${label}.stderr.log</string>
</dict>
</plist>
EOF
  launchctl bootout "gui/${UID_NUM}/${label}" 2>/dev/null || true
  launchctl bootstrap "gui/${UID_NUM}" "$path"
  echo "loaded ${label}"
}

write_runtime_plist() {
  local label="work.dream-machine.runtime"
  local path="${AGENTS_DIR}/${label}.plist"
  cat >"$path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>set -a && source ${ENV_FILE} && set +a && cd ${UI_ROOT} && exec node .output/server/index.mjs</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LAB_ROOT}/logs/${label}.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${LAB_ROOT}/logs/${label}.stderr.log</string>
</dict>
</plist>
EOF
  launchctl bootout "gui/${UID_NUM}/${label}" 2>/dev/null || true
  launchctl bootstrap "gui/${UID_NUM}" "$path"
  echo "loaded ${label} (requires prior pnpm build — run deploy-lab-runtime.sh)"
}

write_interval_plist "work.dream-machine.golden-bridge-hourly" \
  "${UI_ROOT}/scripts/golden-bridge/run-hourly.sh" 3600

write_interval_plist "work.dream-machine.golden-bridge-daily" \
  "${UI_ROOT}/scripts/golden-bridge/run-daily.sh" 86400

if [[ -f "$ENV_FILE" ]]; then
  write_runtime_plist
else
  echo "warn: ${ENV_FILE} missing — runtime launchd skipped"
fi

echo "Golden Bridge installed. Logs: ${LAB_ROOT}/logs/"
#!/usr/bin/env bash
# Golden Bridge — hourly maintenance (Ring 3)
set -euo pipefail

LAB_ROOT="${LAB_ROOT:-/Lab}"
LOG="${LAB_ROOT}/logs/golden-bridge-hourly.log"
RUNTIME_URL="${DREAM_MACHINE_RUNTIME_URL:-http://127.0.0.1:3000}"
TOKEN="${DREAM_MACHINE_RUNTIME_TOKEN:-}"

mkdir -p "${LAB_ROOT}/logs"
exec >>"$LOG" 2>&1
echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) hourly ==="

# Disk
df -h / | tail -1

# Tunnel / runtime health
if [[ -n "$TOKEN" ]]; then
  code="$(curl -s -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"mode":"rows","scope":{}}' \
    "${RUNTIME_URL}/projection" || echo "000")"
  echo "projection HTTP $code"
fi

if pgrep -x cloudflared >/dev/null 2>&1; then
  echo "cloudflared running"
else
  echo "WARN: cloudflared not running"
fi
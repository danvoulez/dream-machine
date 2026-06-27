#!/usr/bin/env bash
# Quick health snapshot — dev machine or LAB.
set -euo pipefail

UI_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAB_ROOT="${LAB_ROOT:-/Lab}"
RUNTIME_URL="${DREAM_MACHINE_RUNTIME_URL:-https://api.lab.minilab.work}"
TOKEN="${DREAM_MACHINE_RUNTIME_TOKEN:-}"

echo "Dream Machine ops status"
echo "  UI_ROOT: ${UI_ROOT}"
echo "  LAB_ROOT: ${LAB_ROOT}"

if command -v vercel >/dev/null 2>&1; then
  echo -n "  vercel: "
  vercel whoami 2>/dev/null || echo "not logged in"
fi

if [[ -f "${UI_ROOT}/.env.hybrid.generated" ]]; then
  echo "  .env.hybrid.generated: present"
else
  echo "  .env.hybrid.generated: missing (pnpm bootstrap:hybrid secrets)"
fi

(cd "${UI_ROOT}" && pnpm contracts:validate) >/dev/null 2>&1 \
  && echo "  contracts:validate: pass" \
  || echo "  contracts:validate: FAIL"

if [[ -n "$TOKEN" ]]; then
  code="$(curl -s -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"mode":"rows","scope":{}}' \
    "${RUNTIME_URL}/projection" 2>/dev/null || echo "000")"
  echo "  POST ${RUNTIME_URL}/projection → HTTP ${code}"
else
  echo "  projection: skipped (set DREAM_MACHINE_RUNTIME_TOKEN)"
fi

if [[ -f "${LAB_ROOT}/logs/golden-bridge-hourly.log" ]]; then
  echo "  golden-bridge hourly (last line):"
  tail -1 "${LAB_ROOT}/logs/golden-bridge-hourly.log" | sed 's/^/    /'
fi
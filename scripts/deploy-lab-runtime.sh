#!/usr/bin/env bash
# Ring 3 — restart LAB projection runtime after KERNEL/SPINE/data changes.
# Usage: /Lab/src/Dream-Machine-Processual-UI/scripts/deploy-lab-runtime.sh
set -euo pipefail

LAB_ROOT="${LAB_ROOT:-/Lab}"
UI_ROOT="${LAB_ROOT}/src/Dream-Machine-Processual-UI"
ENV_FILE="${LAB_ROOT}/env/runtime.env"

if [[ ! -d "$UI_ROOT" ]]; then
  echo "error: UI_ROOT not found: $UI_ROOT" >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

cd "$UI_ROOT"

echo "==> install"
pnpm install --frozen-lockfile

echo "==> contracts"
pnpm contracts:validate

echo "==> pack seal"
pnpm pack:runtime

echo "==> build"
pnpm build

echo "==> restart runtime (launchd label work.dream-machine.runtime if installed)"
if launchctl print "gui/$(id -u)/work.dream-machine.runtime" &>/dev/null; then
  launchctl kickstart -k "gui/$(id -u)/work.dream-machine.runtime"
  echo "restarted work.dream-machine.runtime"
else
  echo "warn: launchd label work.dream-machine.runtime not loaded — start manually:"
  echo "  set -a && source $ENV_FILE && set +a && node $UI_ROOT/.output/server/index.mjs"
fi

echo "==> smoke /projection"
if [[ -n "${DREAM_MACHINE_RUNTIME_TOKEN:-}" ]]; then
  code="$(curl -s -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer ${DREAM_MACHINE_RUNTIME_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"mode":"rows","scope":{}}' \
    "http://127.0.0.1:${PORT:-3000}/projection" || true)"
  echo "POST /projection → HTTP $code"
fi

echo "done"
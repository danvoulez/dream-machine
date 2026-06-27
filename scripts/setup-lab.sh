#!/usr/bin/env bash
# Ring 3 — one-time LAB 8GB layout + Golden Bridge + runtime launchd.
# Run on the LAB machine after syncing Projetos to /Lab/src/.
set -euo pipefail

LAB_ROOT="${LAB_ROOT:-/Lab}"
UI_ROOT="${LAB_ROOT}/src/Dream-Machine-Processual-UI"
KERNEL_ROOT="${LAB_ROOT}/src/Dream-Machine-LogLine-Acts"
ENVELOPE_ROOT="${LAB_ROOT}/src/Dream-Machine-Envelope-Ledger"

echo "==> LAB layout ${LAB_ROOT}"
sudo mkdir -p "${LAB_ROOT}"/{src,data,env,logs,bin,backups}
sudo chown -R "$(id -un)" "${LAB_ROOT}"

if [[ ! -d "$UI_ROOT" ]]; then
  echo "error: sync Projetos first — missing ${UI_ROOT}" >&2
  exit 1
fi

ENV_SRC="${UI_ROOT}/.env.lab.generated"
if [[ -f "$ENV_SRC" ]]; then
  cp "$ENV_SRC" "${LAB_ROOT}/env/runtime.env"
  echo "copied .env.lab.generated → ${LAB_ROOT}/env/runtime.env"
elif [[ ! -f "${LAB_ROOT}/env/runtime.env" ]]; then
  echo "warn: no runtime.env — run on dev machine: pnpm bootstrap:hybrid lab-env" >&2
fi

echo "==> seed / link ledgers"
if [[ -f "${KERNEL_ROOT}/.lab/lab.sqlite" && ! -f "${LAB_ROOT}/data/lab.sqlite" ]]; then
  cp "${KERNEL_ROOT}/.lab/lab.sqlite" "${LAB_ROOT}/data/lab.sqlite"
  echo "seeded lab.sqlite from KERNEL .lab"
fi
if [[ -f "${ENVELOPE_ROOT}/.board/board.sqlite" && ! -f "${LAB_ROOT}/data/board.sqlite" ]]; then
  cp "${ENVELOPE_ROOT}/.board/board.sqlite" "${LAB_ROOT}/data/board.sqlite"
  echo "seeded board.sqlite from SPINE .board"
fi
if [[ -d "$ENVELOPE_ROOT" && -f "${LAB_ROOT}/data/lab.sqlite" ]]; then
  (cd "$ENVELOPE_ROOT" && node scripts/derive-from-logline.mjs) || echo "warn: derive-from-logline failed"
fi

chmod +x "${UI_ROOT}/scripts/golden-bridge/"*.sh
chmod +x "${UI_ROOT}/scripts/deploy-lab-runtime.sh"
chmod +x "${UI_ROOT}/scripts/setup-lab.sh"

echo "==> Golden Bridge + runtime launchd"
"${UI_ROOT}/scripts/golden-bridge/install-lab.sh"

echo "==> first deploy"
"${UI_ROOT}/scripts/deploy-lab-runtime.sh"

echo "done — verify tunnel: curl -H 'Authorization: Bearer \$TOKEN' https://api.lab.minilab.work/projection"
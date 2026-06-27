#!/usr/bin/env bash
# Golden Bridge — daily maintenance (Ring 3)
set -euo pipefail

LAB_ROOT="${LAB_ROOT:-/Lab}"
UI_ROOT="${LAB_ROOT}/src/Dream-Machine-Processual-UI"
KERNEL_ROOT="${LAB_ROOT}/src/Dream-Machine-LogLine-Acts"
LOG="${LAB_ROOT}/logs/golden-bridge-daily.log"
BACKUP_DIR="${LAB_ROOT}/backups/$(date -u +%Y%m%d)"

mkdir -p "${LAB_ROOT}/logs" "$BACKUP_DIR"
exec >>"$LOG" 2>&1
echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) daily ==="

# Backup ledgers
for f in "${LAB_ROOT}/data/lab.sqlite" "${LAB_ROOT}/data/board.sqlite"; do
  if [[ -f "$f" ]]; then
    cp "$f" "${BACKUP_DIR}/$(basename "$f")"
    echo "backed up $(basename "$f")"
  fi
done

# Fleet audit
if [[ -d "$KERNEL_ROOT" ]]; then
  (cd "$KERNEL_ROOT" && python3 -m lab.cli fleet audit --root fleet) || echo "WARN: fleet audit failed"
fi

# Pack seal
if [[ -d "$UI_ROOT" ]]; then
  (cd "$UI_ROOT" && pnpm pack:runtime) || echo "WARN: pack:runtime failed"
fi

# Derive pipe (idempotent)
ENVELOPE_ROOT="${LAB_ROOT}/src/Dream-Machine-Envelope-Ledger"
if [[ -f "${ENVELOPE_ROOT}/scripts/derive-from-logline.mjs" ]]; then
  (cd "$ENVELOPE_ROOT" && node scripts/derive-from-logline.mjs) || echo "WARN: derive failed"
fi

"${UI_ROOT}/scripts/golden-bridge/run-hourly.sh" || true
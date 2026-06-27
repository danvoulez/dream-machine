#!/usr/bin/env bash
# Rsync Projetos triple-repo to LAB 8GB (Ring 3 src tree).
#
# Usage:
#   LAB_HOST=lab-8gb LAB_SRC=/Lab/src ./scripts/sync-lab.sh
#
# Requires: SSH key auth to LAB_HOST
set -euo pipefail

WS_ENV="$(cd "$(dirname "$0")/../.." && pwd)/.env"
if [[ -f "$WS_ENV" ]]; then set -a; # shellcheck disable=SC1090
  source "$WS_ENV"; set +a; fi

LAB_HOST="${LAB_HOST:?set LAB_HOST in Projetos/.env}"
LAB_SRC="${LAB_SRC:-/Lab/src}"
WS_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

for repo in Dream-Machine-Processual-UI Dream-Machine-LogLine-Acts Dream-Machine-Envelope-Ledger; do
  src="${WS_ROOT}/${repo}"
  if [[ ! -d "$src" ]]; then
    echo "error: missing ${src}" >&2
    exit 1
  fi
  echo "==> rsync ${repo}"
  rsync -az --delete \
    --exclude node_modules \
    --exclude .output \
    --exclude .nitro \
    --exclude .nuxt \
    --exclude .pnpm-store \
    --exclude .pack \
    --exclude .git/objects \
    "${src}/" "${LAB_HOST}:${LAB_SRC}/${repo}/"
done

echo "done — on LAB: cd ${LAB_SRC}/Dream-Machine-Processual-UI && pnpm setup:lab"
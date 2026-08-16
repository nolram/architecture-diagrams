#!/usr/bin/env bash
# Wrapper fino que resolve o CLI do renderer relativo a este arquivo,
# para que a skill funcione independente de onde o cwd atual esteja.
set -euo pipefail
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
DIR="$(cd "$(dirname "$SCRIPT_PATH")/../.." && pwd)"

if [ ! -f "$DIR/dist/cli.js" ]; then
  echo "dist/cli.js não encontrado — rodando build inicial em $DIR..." >&2
  (cd "$DIR" && npm install --silent && npm run build --silent)
fi

node "$DIR/dist/cli.js" "$@"

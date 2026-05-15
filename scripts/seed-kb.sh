#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
SEED_API_KEY="${SEED_API_KEY:-}"

if [[ -n "${SEED_API_KEY}" ]]; then
  curl -sS -X POST "${BASE_URL}/api/admin/seed-kb" \
    -H "Authorization: Bearer ${SEED_API_KEY}"
else
  curl -sS -X POST "${BASE_URL}/api/admin/seed-kb"
fi

echo

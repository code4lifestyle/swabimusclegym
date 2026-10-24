#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — add Firebase keys first."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

AUTH_FILE="$HOME/Library/Application Support/com.vercel.cli/auth.json"
if [[ -z "${VERCEL_TOKEN:-}" && -f "$AUTH_FILE" ]]; then
  VERCEL_TOKEN="$(python3 - <<'PY'
import json
from pathlib import Path
path = Path.home() / "Library/Application Support/com.vercel.cli/auth.json"
print(json.loads(path.read_text())["token"])
PY
)"
  export VERCEL_TOKEN
fi

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "No Vercel token. Run: npx vercel login"
  exit 1
fi

echo "==> Linking project"
npx --yes vercel@latest link --yes --project swabimusclegym --token "$VERCEL_TOKEN"

echo "==> Syncing env vars"
for key in \
  VITE_FIREBASE_API_KEY \
  VITE_FIREBASE_AUTH_DOMAIN \
  VITE_FIREBASE_PROJECT_ID \
  VITE_FIREBASE_STORAGE_BUCKET \
  VITE_FIREBASE_MESSAGING_SENDER_ID \
  VITE_FIREBASE_APP_ID \
  VITE_ADMIN_EMAIL
do
  value="${!key:-}"
  if [[ -z "$value" ]]; then
    echo "Missing $key in .env.local"
    exit 1
  fi
  for target in production preview development; do
    printf '%s' "$value" | npx --yes vercel@latest env add "$key" "$target" --token "$VERCEL_TOKEN" --force >/dev/null 2>&1 || true
  done
  echo "  set $key"
done

echo "==> Production deploy"
npx --yes vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN"

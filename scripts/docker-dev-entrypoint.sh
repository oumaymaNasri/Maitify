#!/bin/sh
set -e

# Le volume anonyme /app/node_modules masque le bind mount : réinstaller si vide ou package.json changé
LOCK_HASH_FILE="node_modules/.docker-package-lock.sha"
CURRENT_HASH="$(sha256sum package-lock.json 2>/dev/null | awk '{print $1}')"

if [ ! -d node_modules/next ] || [ ! -f "$LOCK_HASH_FILE" ] || [ "$(cat "$LOCK_HASH_FILE")" != "$CURRENT_HASH" ]; then
  echo "[docker] npm ci dans le volume node_modules (hors synchronisation hôte)…"
  npm ci
  echo "$CURRENT_HASH" > "$LOCK_HASH_FILE"
fi

if [ ! -d node_modules/.prisma/client ]; then
  echo "[docker] prisma generate…"
  npx prisma generate
fi

exec "$@"

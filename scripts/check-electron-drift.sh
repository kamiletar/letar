#!/usr/bin/env bash
# Сверяет точную версию electron в devDependencies каждого Electron-приложения
# с диапазоном в корневом package.json. Разбор паттерна и почему версия должна
# быть точной — .claude/docs/electron-version-drift.md
set -euo pipefail

cd "$(dirname "$0")/.."

root_range=$(grep -oE '"electron": *"[^"]+"' package.json | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
if [ -z "$root_range" ]; then
  echo "не удалось извлечь версию electron из корневого package.json" >&2
  exit 1
fi

status=0
for pkg in apps/*/package.json; do
  app_version=$(grep -oE '"electron": *"[0-9]+\.[0-9]+\.[0-9]+"' "$pkg" | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || true)
  if [ -z "$app_version" ]; then
    continue
  fi
  if [ "$app_version" != "$root_range" ]; then
    echo "дрейф: $pkg держит electron@$app_version, корень — $root_range" >&2
    status=1
  fi
done

if [ "$status" -eq 0 ]; then
  echo "electron версии синхронны: $root_range"
fi
exit $status

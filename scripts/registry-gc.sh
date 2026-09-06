#!/usr/bin/env bash
# registry-gc.sh — ретеншн тегов self-hosted registry (infra/registry, PLAN-INFRA-6.md §157).
#
# Хранит последние KEEP_TAGS SHA-тегов на репозиторий — та же схема, что уже действующий
# локальный ретеншн в deploy-affected.sh (~строка 1237): образы тегируются двойным тегом
# `<app>:latest`/`<app>:staging` (плавающий указатель) + `<app>:<git-short-sha>` (7-12 hex,
# тег для отката). Здесь чистятся только SHA-теги одного репозитория — плавающие теги
# (:latest, :staging) не трогаем: это не история версий, а текущий деплой.
#
# /v2/<name>/tags/list не отдаёт дату создания тега — единственный источник времени
# сборки, который есть у registry API, это поле `created` внутри JSON конфига образа
# (blob, на который ссылается manifest.config.digest). Поэтому на каждый тег — три
# HTTP-запроса (manifest → digest конфига → сам конфиг), не один.
#
# DELETE /v2/<name>/manifests/<digest> снимает только манифест — блобы (слои) остаются на
# диске до `registry garbage-collect`, поэтому GC запускается в конце, но только если
# реально что-то удалено (иначе он просто лишний проход по всему хранилищу).
#
# ⚠️ Официальная рекомендация Docker — не пушить в registry во время garbage-collect
# (race между GC и конкурентным push теми же блобами). Запускать в окно низкой нагрузки
# (ночью, как nx-cache-cleanup — см. apps/dashboard-agent/src/lib/nx-cache-cleanup.ts),
# не в середине рабочего дня. Автоматическое расписание пока не заведено — см. README
# infra/registry, раздел «Ретеншн», для статуса и почему это отдельная задача, не часть
# пилота.
#
# Использование (на s3, из корня letar):
#   REGISTRY_USER=admin REGISTRY_PASS=<пароль из KeePassXC> scripts/registry-gc.sh
#   DRY_RUN=true REGISTRY_USER=admin REGISTRY_PASS=... scripts/registry-gc.sh   # только показать
#
# Требует: curl, jq. Запускать на том же хосте, где контейнер registry (garbage-collect —
# через docker exec, не через HTTP API).

set -euo pipefail

REGISTRY_URL="${REGISTRY_URL:-https://registry.s3.letar.best}"
REGISTRY_USER="${REGISTRY_USER:?REGISTRY_USER не задан}"
REGISTRY_PASS="${REGISTRY_PASS:?REGISTRY_PASS не задан}"
KEEP_TAGS="${KEEP_TAGS:-3}"
DRY_RUN="${DRY_RUN:-false}"

curl_auth() {
  curl -fsS -u "${REGISTRY_USER}:${REGISTRY_PASS}" "$@"
}

echo "[registry-gc] Каталог репозиториев ($REGISTRY_URL)..."
REPOS="$(curl_auth "${REGISTRY_URL}/v2/_catalog?n=1000" | jq -r '.repositories[]')"

DELETED_ANY=false

while IFS= read -r repo; do
  [ -z "$repo" ] && continue
  echo "[registry-gc] $repo"

  SHA_TAGS="$(curl_auth "${REGISTRY_URL}/v2/${repo}/tags/list" \
    | jq -r '.tags[]? | select(test("^[0-9a-f]{7,12}$"))')"
  [ -z "$SHA_TAGS" ] && continue

  ROWS=""
  while IFS= read -r tag; do
    [ -z "$tag" ] && continue
    MANIFEST_HEADERS="$(curl_auth -sI \
      -H 'Accept: application/vnd.docker.distribution.manifest.v2+json' \
      "${REGISTRY_URL}/v2/${repo}/manifests/${tag}")"
    DIGEST="$(echo "$MANIFEST_HEADERS" | grep -i '^docker-content-digest:' | tr -d '\r' | awk '{print $2}')"
    [ -z "$DIGEST" ] && continue

    CONFIG_DIGEST="$(curl_auth -H 'Accept: application/vnd.docker.distribution.manifest.v2+json' \
      "${REGISTRY_URL}/v2/${repo}/manifests/${tag}" | jq -r '.config.digest')"
    CREATED="$(curl_auth "${REGISTRY_URL}/v2/${repo}/blobs/${CONFIG_DIGEST}" | jq -r '.created')"

    ROWS="${ROWS}${CREATED}"$'\t'"${tag}"$'\t'"${DIGEST}"$'\n'
  done <<<"$SHA_TAGS"

  [ -z "$ROWS" ] && continue

  # Сортировка по created убыв. (новые первыми), оставляем KEEP_TAGS, остальное — на удаление.
  TO_DELETE="$(printf '%s' "$ROWS" | sort -r | tail -n "+$((KEEP_TAGS + 1))")"
  [ -z "$TO_DELETE" ] && continue

  while IFS=$'\t' read -r created tag digest; do
    [ -z "$tag" ] && continue
    echo "[registry-gc]   удаляю ${repo}:${tag} (создан ${created}, ${digest})"
    if [ "$DRY_RUN" != "true" ]; then
      curl_auth -X DELETE "${REGISTRY_URL}/v2/${repo}/manifests/${digest}"
      DELETED_ANY=true
    fi
  done <<<"$TO_DELETE"
done <<<"$REPOS"

if [ "$DELETED_ANY" = true ]; then
  echo "[registry-gc] Запускаю garbage-collect внутри контейнера registry..."
  docker exec registry bin/registry garbage-collect /etc/docker/registry/config.yml
else
  echo "[registry-gc] Нечего удалять (или DRY_RUN=true) — garbage-collect не запускаю."
fi

echo "[registry-gc] Готово."

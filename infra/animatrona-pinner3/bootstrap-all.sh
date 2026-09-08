#!/bin/bash
# Бутстрап всех IPFS нод: peering + регистрация на relay
#
# ⛔ ОБЕЗВРЕЖЕН 2026-09-08 (PLAN-INFRA-3.md §57 DoD, doc-cleanup) — топология ниже устарела
# целиком, живой прогон сломал бы работающую сеть, а не восстановил бы её:
#
#   1. Выделенный VPS pinner3 (188.127.235.38) больше не наш — `ssh` отвечает
#      "REMOTE HOST IDENTIFICATION HAS CHANGED" (хостер переиспользовал IP), проверено 2026-09-08.
#   2. `GATEWAY_PEER_ID` ниже — PeerId старого узла на s2 (`animatrona-gateway`, контейнер не
#      существует уже давно). Актуальный узел — `kubo` на s3 (`infra/letar-ipfs/`), PeerId
#      `12D3KooWM7KtRLjqRmJzva7Qy5KZzfaLES4Fk8GgnjabbWoo8A52` — ДРУГОЙ, не то же самое.
#   3. Шаг 3 ниже (`ssh root@s2.letar.best "docker exec animatrona-gateway ..."`) целится в
#      несуществующий контейнер на несуществующей больше роли s2 в этой сети (§57 «Разделение
#      имён» — гейтвей ушёл на s3, кеш-прокси на mail).
#   4. `pinner1` (mail, `animatrona-pinner`) тоже не существует — см.
#      `infra/animatrona-pinner/README.md`.
#
# Оставлен как история — образец того, как выглядел peering-bootstrap для сети из pinner1/pinner2→
# pinner3/gateway на s2. Актуальной топологии сети (один узел `infra/letar-ipfs/` на s3) этот
# скрипт не соответствует и переписывать его под неё избыточно — bootstrap там не нужен вовсе
# (нет соседних пиннеров, которых надо было бы взаимно попировать).
echo "⛔ bootstrap-all.sh обезврежен — устаревшая топология, см. комментарий в начале файла." >&2
echo "   Актуальная сеть: infra/letar-ipfs/ (единственный узел, s3), без bootstrap-скрипта." >&2
exit 1

# --- Ниже — оригинальный скрипт, не выполняется (exit 1 выше) ---
#
# Запускать ПОСЛЕ setup.sh на pinner3 (нужен PeerId)
#
# Использование:
#   bash bootstrap-all.sh <PINNER3_PEER_ID>
#
# Что делает:
#   1. Регистрирует ВСЕ ноды на relay (POST /register)
#   2. Обновляет peering на pinner1 (заменяет pinner2 на pinner3)
#   3. Обновляет peering на gateway (заменяет pinner2 на pinner3)

set -e

PINNER3_PEER_ID="${1:?Укажи PINNER3_PEER_ID как первый аргумент}"

RELAY_PEER_ID="12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA"
PINNER1_PEER_ID="12D3KooWLJ3juXbEmfhBu4YTWBKQJCkgC5k9N8SMeBqTzscSxq9j"
GATEWAY_PEER_ID="12D3KooWJtQXuNd4g5w3fH7bCSj4o4DA1PLBFjRGowiBbf6zqxa6"

RELAY_REGISTER_URL="http://31.56.180.161:41080/register"

echo "=== Бутстрап всех IPFS нод ==="
echo ""

# --- 1. Регистрация всех нод на relay ---
echo "--- 1. Регистрация на relay ---"

register_on_relay() {
  local peer_id=$1
  local name=$2
  local result
  result=$(curl -s -w "\n%{http_code}" -X POST "$RELAY_REGISTER_URL" \
    -H "Content-Type: application/json" \
    -d "{\"peer_id\": \"$peer_id\", \"app_version\": \"$name\"}")
  local http_code
  http_code=$(echo "$result" | tail -1)
  if [ "$http_code" = "200" ]; then
    echo "  ✅ $name ($peer_id)"
  else
    echo "  ⚠️  $name: HTTP $http_code — $(echo "$result" | head -1)"
  fi
}

register_on_relay "$PINNER1_PEER_ID" "pinner1"
register_on_relay "$PINNER3_PEER_ID" "pinner3"
register_on_relay "$GATEWAY_PEER_ID" "gateway"

echo ""

# --- 2. Обновить peering на pinner1 (mail, 31.56.180.161) ---
echo "--- 2. Pinner1 (mail) — обновление peering (pinner2 → pinner3) ---"
ssh root@31.56.180.161 "docker exec animatrona-pinner ipfs config --json Peering.Peers '[
  {\"ID\": \"$RELAY_PEER_ID\", \"Addrs\": [\"/ip4/31.56.180.161/tcp/41001\"]},
  {\"ID\": \"$GATEWAY_PEER_ID\", \"Addrs\": [\"/ip4/185.28.85.195/tcp/42001\"]},
  {\"ID\": \"$PINNER3_PEER_ID\", \"Addrs\": [\"/ip4/188.127.235.38/tcp/4001\"]}
]' && docker-compose restart"
echo "  ✅ Pinner1 peering обновлён"
echo ""

# --- 3. Обновить peering на gateway (s2, 185.28.85.195) ---
echo "--- 3. Gateway (s2) — обновление peering (pinner2 → pinner3) ---"
ssh root@s2.letar.best "docker exec animatrona-gateway ipfs config --json Peering.Peers '[
  {\"ID\": \"$RELAY_PEER_ID\", \"Addrs\": [\"/ip4/31.56.180.161/tcp/41001\"]},
  {\"ID\": \"$PINNER1_PEER_ID\", \"Addrs\": [\"/ip4/31.56.180.161/tcp/43001\"]},
  {\"ID\": \"$PINNER3_PEER_ID\", \"Addrs\": [\"/ip4/188.127.235.38/tcp/4001\"]}
]' && cd /root/animatrona-gateway && docker compose restart"
echo "  ✅ Gateway peering обновлён"
echo ""

# --- 4. Верификация ---
echo "--- 4. Верификация связей ---"
echo "Ожидание установления соединений (15 сек)..."
sleep 15

echo ""
echo "Pinner3 peers:"
ssh root@188.127.235.38 "docker exec animatrona-pinner3 ipfs swarm peers" 2>/dev/null || echo "  (не удалось подключиться)"

echo ""
echo "Pinner1 peers:"
ssh root@31.56.180.161 "docker exec animatrona-pinner ipfs swarm peers" 2>/dev/null || echo "  (не удалось подключиться)"

echo ""
echo "Gateway peers:"
ssh root@s2.letar.best "docker exec animatrona-gateway ipfs swarm peers" 2>/dev/null || echo "  (не удалось подключиться)"

echo ""
echo "=== Готово ==="
echo ""
echo "Не забудь обновить kubo-config.ts:"
echo "  export const PINNER3_PEER_ID = '$PINNER3_PEER_ID'"

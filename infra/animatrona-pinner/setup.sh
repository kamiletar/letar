#!/bin/bash
# Настройка Animatrona Pinner (Kubo) на mail.letar.best
#
# Этот узел:
# - Пинит IPFS контент по запросу трекера
# - Подключается к relay и gateway через peering
# - API защищён bearer-токеном (API.Authorizations)
#
# Использование:
#   1. Скопировать папку на сервер
#   2. Запустить: bash setup.sh
#   3. Скопировать AUTH_TOKEN и PeerId из вывода
#   4. В трекере: Админ → Пин-серверы → Добавить сервер

set -e

echo "=== Animatrona Pinner Setup (mail.letar.best) ==="

# --- Генерация токена авторизации ---
AUTH_TOKEN=$(openssl rand -hex 32)
echo ""
echo "Сгенерирован токен авторизации: $AUTH_TOKEN"
echo "(сохраните — понадобится при добавлении сервера в трекер)"
echo ""

# Запуск контейнера
echo "Запуск IPFS для инициализации..."
docker-compose up -d

echo "Ожидание инициализации (30 сек)..."
sleep 30

CONTAINER="animatrona-pinner"

echo "Настройка пиннера..."

# --- Routing ---
# DHT client mode
docker exec $CONTAINER ipfs config --json Routing.Type '"dhtclient"'

# --- Swarm ---
# Relay client (для связи через relay)
docker exec $CONTAINER ipfs config --json Swarm.RelayClient.Enabled true
# Hole punching
docker exec $CONTAINER ipfs config --json Swarm.EnableHolePunching true

# Лимиты соединений (lowpower)
docker exec $CONTAINER ipfs config --json Swarm.ConnMgr.LowWater 30
docker exec $CONTAINER ipfs config --json Swarm.ConnMgr.HighWater 100
docker exec $CONTAINER ipfs config --json Swarm.ConnMgr.GracePeriod '"1m"'

# --- Peering ---
# Relay + Gateway + Pinner3 — приоритетные пиры (БЕЗ pinner2, списан)
RELAY_PEER_ID="12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA"
GATEWAY_PEER_ID="12D3KooWJtQXuNd4g5w3fH7bCSj4o4DA1PLBFjRGowiBbf6zqxa6"
PINNER3_PEER_ID="12D3KooWP5hrqw8HHXUGaepSSRhsa8isoTAbcnRnKkjgHhWRLxiV"

docker exec $CONTAINER ipfs config --json Peering.Peers "[
  {
    \"ID\": \"$RELAY_PEER_ID\",
    \"Addrs\": [\"/ip4/31.56.180.161/tcp/41001\"]
  },
  {
    \"ID\": \"$GATEWAY_PEER_ID\",
    \"Addrs\": [\"/ip4/185.28.85.195/tcp/42001\"]
  },
  {
    \"ID\": \"$PINNER3_PEER_ID\",
    \"Addrs\": [\"/ip4/188.127.235.38/tcp/4001\"]
  }
]"

# --- Bootstrap ---
# Relay + Pinner3 + стандартные (БЕЗ pinner2)
docker exec $CONTAINER ipfs bootstrap rm --all
docker exec $CONTAINER ipfs bootstrap add /ip4/31.56.180.161/tcp/41001/p2p/$RELAY_PEER_ID
docker exec $CONTAINER ipfs bootstrap add /ip4/188.127.235.38/tcp/4001/p2p/$PINNER3_PEER_ID
docker exec $CONTAINER ipfs bootstrap add /dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN
docker exec $CONTAINER ipfs bootstrap add /dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa
docker exec $CONTAINER ipfs bootstrap add /dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb

# --- API Авторизация ---
# Bearer token — Kubo проверяет заголовок Authorization: Bearer <token>
docker exec $CONTAINER ipfs config --json API.Authorizations "{
  \"admin-pin\": {
    \"AuthSecret\": \"bearer:${AUTH_TOKEN}\",
    \"AllowedPaths\": [\"/api/v0\"]
  }
}"

# CORS для API — трекер обращается серверно, CORS не нужен,
# но оставим на случай отладки из браузера
docker exec $CONTAINER ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["https://animatrona-tracker.letar.best"]'
docker exec $CONTAINER ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["GET", "POST"]'

# Перезапуск с новой конфигурацией
echo "Перезапуск с новой конфигурацией..."
docker-compose restart

sleep 10

# Результат
echo ""
echo "=== РЕЗУЛЬТАТ ==="
PEER_ID=$(docker exec $CONTAINER ipfs id -f='<id>')
echo ""
echo "PeerId:     $PEER_ID"
echo "AUTH_TOKEN: $AUTH_TOKEN"
echo ""
echo "API:   http://31.56.180.161:5011/api/v0/"
echo "Swarm: 43001/tcp+udp"
echo ""
echo "Для добавления в трекер:"
echo "  URL:        http://31.56.180.161:5011"
echo "  Auth Token: $AUTH_TOKEN"
echo ""
echo "=== ВНИМАНИЕ: взаимный peering ==="
echo "На s2 (gateway) и pinner3 нужно добавить этот пиннер в Peering.Peers:"
echo ""
echo "Gateway (s2):"
echo "  docker exec animatrona-gateway ipfs config --json Peering.Peers.+ '{"
echo "    \"ID\": \"$PEER_ID\", \"Addrs\": [\"/ip4/31.56.180.161/tcp/43001\"]"
echo "  }'"
echo ""
echo "Pinner3 уже знает про pinner1 если setup.sh запущен после обновления."

#!/bin/bash
# Настройка Animatrona Gateway (Kubo) на s2
#
# Этот узел:
# - Подключается к приватному relay и локальному ПК
# - Предоставляет HTTP Gateway для animatrona-web
# - НЕ является relay (только клиент)

set -e

echo "=== Animatrona Gateway Setup (s2) ==="

# Запустить контейнер
echo "Запуск IPFS для инициализации..."
docker compose up -d

echo "Ожидание инициализации (30 сек)..."
sleep 30

CONTAINER="animatrona-gateway"

echo "Настройка gateway..."

# --- Routing ---
# DHT client mode (за NAT не нужен server)
docker exec $CONTAINER ipfs config --json Routing.Type '"dhtclient"'

# --- Swarm ---
# Relay client (для связи через relay)
docker exec $CONTAINER ipfs config --json Swarm.RelayClient.Enabled true
# Hole punching (прямое соединение после relay handshake)
docker exec $CONTAINER ipfs config --json Swarm.EnableHolePunching true

# Лимиты соединений (lowpower)
docker exec $CONTAINER ipfs config --json Swarm.ConnMgr.LowWater 30
docker exec $CONTAINER ipfs config --json Swarm.ConnMgr.HighWater 100
docker exec $CONTAINER ipfs config --json Swarm.ConnMgr.GracePeriod '"1m"'

# --- Peering ---
# Приватный relay + пиннер — приоритетные пиры
# PINNER_PEER_ID нужно подставить после первого запуска пиннера
docker exec $CONTAINER ipfs config --json Peering.Peers '[
  {
    "ID": "12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA",
    "Addrs": ["/ip4/31.56.180.161/tcp/41001"]
  },
  {
    "ID": "12D3KooWLJ3juXbEmfhBu4YTWBKQJCkgC5k9N8SMeBqTzscSxq9j",
    "Addrs": ["/ip4/31.56.180.161/tcp/43001"]
  }
]'

# --- Bootstrap ---
# Relay + пиннер первыми, затем стандартные
docker exec $CONTAINER ipfs bootstrap rm --all
docker exec $CONTAINER ipfs bootstrap add /ip4/31.56.180.161/tcp/41001/p2p/12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA
docker exec $CONTAINER ipfs bootstrap add /ip4/31.56.180.161/tcp/43001/p2p/12D3KooWLJ3juXbEmfhBu4YTWBKQJCkgC5k9N8SMeBqTzscSxq9j
docker exec $CONTAINER ipfs bootstrap add /dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN
docker exec $CONTAINER ipfs bootstrap add /dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa
docker exec $CONTAINER ipfs bootstrap add /dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb

# --- Gateway ---
# CORS для API (admin операции)
docker exec $CONTAINER ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:3011", "https://anime.letar.best"]'
docker exec $CONTAINER ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["GET", "POST"]'
# CORS для Gateway — только трекер
docker exec $CONTAINER ipfs config --json Gateway.HTTPHeaders.Access-Control-Allow-Origin '["https://animatrona-tracker.letar.best"]'
docker exec $CONTAINER ipfs config --json Gateway.HTTPHeaders.Access-Control-Allow-Methods '["GET", "HEAD", "OPTIONS"]'

# Перезапуск
echo "Перезапуск с новой конфигурацией..."
docker compose restart

sleep 10

# Результат
echo ""
echo "=== РЕЗУЛЬТАТ ==="
PEER_ID=$(docker exec $CONTAINER ipfs id -f='<id>')
echo ""
echo "PeerId: $PEER_ID"
echo ""
echo "Gateway: http://127.0.0.1:8180/ipfs/<CID>"
echo "API:     http://127.0.0.1:5201/api/v0/"
echo "Swarm:   42001/tcp+udp"
echo ""
echo "Для добавления PeerId локального ПК (peering):"
echo "  docker exec $CONTAINER ipfs config --json Peering.Peers '[...]'"
echo ""
echo "Проверка подключения к relay:"
echo "  docker exec $CONTAINER ipfs swarm peers | grep 31.56.180.161"

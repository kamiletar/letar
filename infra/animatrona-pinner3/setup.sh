#!/bin/bash
# Настройка Animatrona Pinner3 + Pin-Queue на 188.127.235.38
#
# VPS: Ubuntu 24.04, 500GB HDD+SSD cache, 4GB RAM, 6 ядер
# - Kubo в server profile (PebbleDS, 3GB RAM)
# - Pin-Queue рядом (host network, localhost:5001)
# - HTTPS через NPM (ipfsstor3.letar.best)
#
# Использование:
#   1. Скопировать infra/animatrona-pinner3/ и infra/animatrona-pin-queue/ на сервер
#   2. Запустить: bash setup.sh
#   3. Скопировать токены и PeerId из вывода
#   4. Настроить HTTPS (docker-compose.npm.yml + npm-init.sh + npm-proxy.sh)
#   5. В трекере: Админ → Пин-серверы → Добавить сервер

set -e

echo "=== Animatrona Pinner3 Setup (188.127.235.38) ==="

# --- Генерация токенов авторизации ---
KUBO_AUTH_TOKEN=$(openssl rand -hex 32)
PIN_QUEUE_AUTH_TOKEN=$(openssl rand -hex 32)

echo ""
echo "Kubo AUTH_TOKEN:      $KUBO_AUTH_TOKEN"
echo "Pin-Queue AUTH_TOKEN: $PIN_QUEUE_AUTH_TOKEN"
echo "(сохраните — понадобится при добавлении сервера в трекер)"
echo ""

# Записываем в .env для docker compose
cat > .env <<EOF
KUBO_AUTH_TOKEN=$KUBO_AUTH_TOKEN
PIN_QUEUE_AUTH_TOKEN=$PIN_QUEUE_AUTH_TOKEN
EOF

# Запуск Kubo (pin-queue запустится после healthcheck)
echo "Запуск IPFS для инициализации..."
docker compose up -d ipfs

echo "Ожидание инициализации (30 сек)..."
sleep 30

CONTAINER="animatrona-pinner3"

echo "Настройка пиннера..."

# --- Routing ---
# none — peering-only, DHT отключён (оптимизация для HDD)
docker exec $CONTAINER ipfs config --json Routing.Type '"none"'

# --- Provide ---
# Отключён — не анонсируем в DHT, работаем через peering
# ВАЖНО: в Kubo v0.40.0 формат именно такой, НЕ просто Strategy: disabled
docker exec $CONTAINER ipfs config --json Provide '{"Strategy": "disabled", "DHT": {"Interval": "0"}}'

# --- GC ---
# Отключён — на пинере не нужен, traverse блоков убивает HDD
docker exec $CONTAINER ipfs config Datastore.GCPeriod '""'

# --- StorageMax ---
docker exec $CONTAINER ipfs config Datastore.StorageMax '"650GB"'

# --- BloomFilter ---
# 1 МБ — хватает RAM для ускорения has-block проверок
docker exec $CONTAINER ipfs config --json Datastore.BloomFilterSize 1048576

# --- Swarm ---
# Relay client (для связи с desktop-клиентами через relay)
docker exec $CONTAINER ipfs config --json Swarm.RelayClient.Enabled true
# Hole punching
docker exec $CONTAINER ipfs config --json Swarm.EnableHolePunching true

# Лимиты соединений
docker exec $CONTAINER ipfs config --json Swarm.ConnMgr.LowWater 200
docker exec $CONTAINER ipfs config --json Swarm.ConnMgr.HighWater 400
docker exec $CONTAINER ipfs config --json Swarm.ConnMgr.GracePeriod '"1m"'

# --- Bitswap (повышен — SSD cache позволяет больше параллелизма) ---
docker exec $CONTAINER ipfs config --json Internal.Bitswap.TaskWorkerCount 4
docker exec $CONTAINER ipfs config --json Internal.Bitswap.EngineBlockstoreWorkerCount 8
docker exec $CONTAINER ipfs config --json Internal.Bitswap.EngineTaskWorkerCount 4

# --- Peering ---
# Relay + Pinner1 + Gateway — приоритетные пиры (БЕЗ pinner2)
RELAY_PEER_ID="12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA"
PINNER1_PEER_ID="12D3KooWLJ3juXbEmfhBu4YTWBKQJCkgC5k9N8SMeBqTzscSxq9j"
GATEWAY_PEER_ID="12D3KooWJtQXuNd4g5w3fH7bCSj4o4DA1PLBFjRGowiBbf6zqxa6"

docker exec $CONTAINER ipfs config --json Peering.Peers "[
  {
    \"ID\": \"$RELAY_PEER_ID\",
    \"Addrs\": [\"/ip4/193.37.68.73/tcp/41001\"]
  },
  {
    \"ID\": \"$PINNER1_PEER_ID\",
    \"Addrs\": [\"/ip4/193.37.68.73/tcp/43001\"]
  },
  {
    \"ID\": \"$GATEWAY_PEER_ID\",
    \"Addrs\": [\"/ip4/185.28.85.195/tcp/42001\"]
  }
]"

# --- Bootstrap ---
# Relay первым, pinner1 вторым, затем стандартные
docker exec $CONTAINER ipfs bootstrap rm --all
docker exec $CONTAINER ipfs bootstrap add /ip4/193.37.68.73/tcp/41001/p2p/$RELAY_PEER_ID
docker exec $CONTAINER ipfs bootstrap add /ip4/193.37.68.73/tcp/43001/p2p/$PINNER1_PEER_ID
docker exec $CONTAINER ipfs bootstrap add /dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN
docker exec $CONTAINER ipfs bootstrap add /dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa
docker exec $CONTAINER ipfs bootstrap add /dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb

# --- API Авторизация ---
docker exec $CONTAINER ipfs config --json API.Authorizations "{
  \"admin-pin\": {
    \"AuthSecret\": \"bearer:${KUBO_AUTH_TOKEN}\",
    \"AllowedPaths\": [\"/api/v0\"]
  }
}"

# CORS для трекера
docker exec $CONTAINER ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["https://animatrona-tracker.letar.best"]'
docker exec $CONTAINER ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["GET", "POST"]'

# --- PebbleDS ---
# Останавливаем Kubo для изменения datastore
echo "Остановка Kubo для миграции на PebbleDS..."
docker compose stop ipfs

# Редактируем конфиг внутри volume
# Находим путь volume
VOLUME_PATH=$(docker volume inspect animatrona-pinner3-data --format '{{.Mountpoint}}')
CONFIG_FILE="$VOLUME_PATH/config"

echo "Конфиг: $CONFIG_FILE"

# Заменяем datastore spec на PebbleDS с увеличенными кэшами (SSD cache позволяет)
python3 -c "
import json

with open('$CONFIG_FILE', 'r') as f:
    config = json.load(f)

config['Datastore']['Spec'] = {
    'type': 'mount',
    'mounts': [
        {
            'mountpoint': '/blocks',
            'type': 'measure',
            'prefix': 'pebble.datastore',
            'child': {
                'type': 'pebbleds',
                'path': 'pebble-blocks',
                'cacheSize': 1610612736  # 1.5 ГБ (SSD cache + 4GB RAM)
            }
        },
        {
            'mountpoint': '/',
            'type': 'measure',
            'prefix': 'pebble.datastore',
            'child': {
                'type': 'pebbleds',
                'path': 'pebble-metadata',
                'cacheSize': 536870912  # 512 МБ
            }
        }
    ]
}

with open('$CONFIG_FILE', 'w') as f:
    json.dump(config, f, indent=2)

print('PebbleDS конфиг записан')
"

# Запуск с новым datastore
echo "Запуск Kubo с PebbleDS..."
docker compose up -d ipfs

echo "Ожидание Kubo (20 сек)..."
sleep 20

# Запуск pin-queue (Kubo уже работает)
echo "Запуск pin-queue..."
docker compose up -d --build pin-queue

sleep 5

# --- Регистрация на relay ---
PEER_ID=$(docker exec $CONTAINER ipfs id -f='<id>')
echo ""
echo "Регистрация на relay-сервере..."
REGISTER_RESULT=$(curl -s -w "\n%{http_code}" -X POST http://193.37.68.73:41080/register \
  -H "Content-Type: application/json" \
  -d "{\"peer_id\": \"$PEER_ID\", \"app_version\": \"pinner3\"}")
HTTP_CODE=$(echo "$REGISTER_RESULT" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Зарегистрирован на relay"
else
  echo "⚠️  Регистрация на relay: HTTP $HTTP_CODE"
  echo "   $(echo "$REGISTER_RESULT" | head -1)"
fi

# --- Результат ---
echo ""
echo "=== РЕЗУЛЬТАТ ==="
echo ""
echo "PeerId:               $PEER_ID"
echo "Kubo AUTH_TOKEN:      $KUBO_AUTH_TOKEN"
echo "Pin-Queue AUTH_TOKEN: $PIN_QUEUE_AUTH_TOKEN"
echo ""
echo "Kubo API:    https://ipfsstor3.letar.best/api/v0/ (после настройки NPM)"
echo "Swarm:       4001/tcp+udp"
echo "Pin-Queue:   https://ipfsstor3.letar.best (после настройки NPM)"
echo ""
echo "=== Для добавления в трекер ==="
echo "  Name:             pinner3 (188.127.235.38)"
echo "  API URL:          https://ipfsstor3.letar.best/api/v0"
echo "  Auth Token:       $KUBO_AUTH_TOKEN"
echo "  Pin Queue URL:    https://ipfsstor3.letar.best"
echo "  Pin Queue Secret: $PIN_QUEUE_AUTH_TOKEN"
echo "  Capacity:         650 GB"
echo ""
echo "=== Следующие шаги ==="
echo "  1. Настроить HTTPS: docker compose -f docker-compose.npm.yml up -d"
echo "  2. bash npm-init.sh"
echo "  3. bash npm-proxy.sh"
echo "  4. В NPM UI включить SSL + Let's Encrypt для ipfsstor3.letar.best"
echo "  5. bash bootstrap-all.sh $PEER_ID"

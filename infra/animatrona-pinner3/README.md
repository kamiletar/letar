# Animatrona Pinner3

Второй IPFS-пиннер (Kubo, `server` profile) + встроенный `pin-queue` на выделенном VPS
(188.127.235.38, Ubuntu 24.04, 500GB HDD+SSD cache, 4GB RAM, 6 ядер). Основной storage-узел сети
— `StorageMax` 650GB, PebbleDS datastore с увеличенными кэшами (SSD cache).

## Текущий деплой

- **Сервер:** 188.127.235.38
- **Swarm:** 4001 (TCP + UDP, стандартный порт)
- **Kubo API:** `127.0.0.1:5001` — только localhost, наружу через Caddy HTTPS
  (`ipfsstor3.letar.best`)
- **Pin-Queue:** `42080` (host network) — наружу через тот же Caddy
- **PeerId:** см. вывод последнего `setup.sh`/`bootstrap-all.sh` (меняется при пересоздании
  volume — сверить с актуальным перед правкой peering на других узлах)

## Характеристики

- **Kubo:** `server` profile, `Routing.Type: none` (peering-only, DHT отключён — экономия для
  HDD), `Provide.Strategy: disabled`, GC отключён (`Datastore.GCPeriod: ""` — traverse блоков
  убивает HDD), `BloomFilterSize` 1MB, Bitswap воркеры повышены (SSD cache позволяет больше
  параллелизма)
- **Datastore:** PebbleDS вместо дефолтного — `setup.sh` останавливает Kubo, патчит `config`
  (JSON) напрямую в volume через `python3`, перезапускает с новым datastore. Это единственный
  узел сети с ручным патчем конфига поверх стандартного `ipfs config` (остальные параметры —
  через `ipfs config --json`)
- **RAM:** Kubo 3GB из 4GB (место для pin-queue, Caddy, системы)
- **Pin-Queue:** собирается из `../animatrona-pin-queue` (build context), host network, зависит
  от healthcheck Kubo

## Установка на новый сервер

```bash
scp -r infra/animatrona-pinner3 infra/animatrona-pin-queue user@188.127.235.38:/path/
cd /path/animatrona-pinner3
bash setup.sh
```

Порядок, зашитый в `setup.sh`:

1. Генерирует `KUBO_AUTH_TOKEN` + `PIN_QUEUE_AUTH_TOKEN` (`openssl rand -hex 32`) → `.env`
2. Запускает Kubo, настраивает routing/provide/GC/storage/swarm/bitswap/peering/bootstrap/API
   auth/CORS
3. Останавливает Kubo, патчит datastore на PebbleDS (см. выше), перезапускает
4. Собирает и запускает `pin-queue` (`docker compose up -d --build pin-queue`)
5. Регистрируется на relay (`POST /register`)

**После `setup.sh` — HTTPS и полный bootstrap:**

```bash
docker compose -f docker-compose.npm.yml up -d   # Caddy, автоматический Let's Encrypt
bash bootstrap-all.sh <PINNER3_PEER_ID>           # регистрирует ВСЕ узлы на relay,
                                                    # обновляет peering на pinner1 и gateway
```

`docker-compose.npm.yml`/`Caddyfile` — HTTPS через Caddy (не Nginx Proxy Manager, как у
остальных приложений монорепо — для одного пиннера проще без UI). `Caddyfile` проксирует и Kubo
API (`/api/v0/*`), и pin-queue (всё остальное) на `ipfsstor3.letar.best`.

`bootstrap-all.sh` требует SSH-доступ к `mail.letar.best` (pinner1) и `s2.letar.best` (gateway) —
меняет их `Peering.Peers` напрямую по SSH. Запускать только после того, как PeerId pinner3
известен и стабилен (после пересоздания volume PeerId меняется — перезапускать bootstrap).

## Мониторинг

```bash
docker ps | grep -E 'animatrona-pinner3|animatrona-pin-queue'
docker logs -f animatrona-pinner3
docker exec animatrona-pinner3 ipfs swarm peers
curl http://localhost:42080/health   # pin-queue healthcheck
```

## Связанные узлы

`infra/animatrona-relay/README.md` (relay), `infra/animatrona-gateway/` (gateway),
`infra/animatrona-pinner/` (pinner1), `infra/animatrona-pin-queue/` (сам сервис pin-queue,
здесь используется как build-зависимость). Общий дизайн сети — корневой `PLAN.md` §15.4.

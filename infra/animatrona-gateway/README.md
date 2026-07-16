# Animatrona Gateway

HTTP-шлюз IPFS (Kubo) для раздачи видео `animatrona-web`/`animatrona-tracker`. Только клиент
сети — сам не является relay и не пинит контент по умолчанию, читает блоки у relay/пиннеров.

## Текущий деплой

- **Сервер:** s2 (185.28.85.195)
- **Swarm:** 42001 (TCP + UDP, нестандартный порт)
- **API:** `127.0.0.1:5201` — только localhost
- **Gateway:** `127.0.0.1:8180` — только localhost, проксируется через Next.js
- **PeerId:** `12D3KooWJtQXuNd4g5w3fH7bCSj4o4DA1PLBFjRGowiBbf6zqxa6`

## Характеристики

- **Образ:** `ipfs/kubo:v0.41.0` (`lowpower` profile)
- **Routing:** `dhtclient` (не сервер DHT)
- **RelayClient/HolePunching:** включены — связь с desktop-клиентами через relay
- **Peering:** relay + pinner1 как приоритетные пиры (см. `setup.sh`)
- **CORS:** API — `localhost:3011`/`anime.letar.best`; Gateway — только
  `animatrona-tracker.letar.best`
- **RAM:** лимит 512M / резерв 128M

## Установка на новый сервер

```bash
scp -r infra/animatrona-gateway user@s2:/path/
cd /path/animatrona-gateway
docker compose up -d
chmod +x setup.sh
./setup.sh
```

`setup.sh` идемпотентно применяет конфиг Kubo (routing/swarm/peering/bootstrap/CORS) поверх уже
запущенного контейнера и делает `docker compose restart`. Peer ID других узлов (relay, pinner1)
внутри скрипта — актуальные на момент последнего запуска; при смене узлов сети обновлять здесь и
в `bootstrap-all.sh` (`infra/animatrona-pinner3/`).

## Мониторинг

```bash
docker ps | grep animatrona-gateway
docker logs -f animatrona-gateway
docker exec animatrona-gateway ipfs swarm peers
docker exec animatrona-gateway ipfs id -f='<id>'
```

## Связанные узлы

Полная топология — `infra/animatrona-relay/README.md` (relay), `infra/animatrona-pinner/`,
`infra/animatrona-pinner3/` (пиннеры). Общий дизайн сети — корневой `PLAN.md` §15.4.

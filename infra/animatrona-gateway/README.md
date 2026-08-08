# Animatrona Gateway

> ## ⛔ ВЫВЕДЕН ИЗ ЭКСПЛУАТАЦИИ (обнаружено 2026-08-08)
>
> **Контейнера `animatrona-gateway` на s2 не существует** — `docker ps -a` не находит его ни в
> каком состоянии. Судя по датам, узел отключили около **17–21 июня 2026**; тогда же перестал
> пополняться его кеш в NPM.
>
> Раздачу берёт на себя `kubo` на **s3**, куда сейчас указывают оба имени —
> `ipfs.letar.best` и `gateway.letar.best`. Кеша перед ним нет; кеширующий прокси планируется на
> mail-сервере, разбор — [PLAN-INFRA.md §57](/PLAN-INFRA.md).
>
> ⛔ **Не разворачивать по этому README, не сверившись с §57.** Описанная ниже схема — состояние
> до июня 2026: другой сервер, другие соседи по peering, свой отдельный кеш. Команды `docker exec
> animatrona-gateway ...` (здесь, в `setup.sh` и в `bootstrap-all.sh` пиннера) обращаются к
> несуществующему контейнеру.
>
> Файлы оставлены как история конфигурации, а не как инструкция.

HTTP-шлюз IPFS (Kubo) для раздачи видео `animatrona-web`/`animatrona-tracker`. Только клиент
сети — сам не является relay и не пинит контент по умолчанию, читает блоки у relay/пиннеров.

## Деплой на момент вывода из эксплуатации

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

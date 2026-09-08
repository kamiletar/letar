# Animatrona Pinner3 ⛔ УСТАРЕЛО — выделенный VPS 188.127.235.38 больше не наш

**Проверено вживую 2026-09-08** (§57 DoD, doc-cleanup): `ssh root@188.127.235.38` отвечает
предупреждением `REMOTE HOST IDENTIFICATION HAS CHANGED` — ED25519-отпечаток сервера не
совпадает с записанным в `known_hosts`. Это не «сервер временно недоступен», а типичный признак
того, что хостер переиспользовал IP под другого клиента после списания VPS: сравнить с
`infra/animatrona-pinner/README.md` (pinner1 на mail — там прямая проверка `docker ps` не нашла
контейнер вообще, здесь равносильный сигнал на уровне самого сервера).

**Что реально сейчас несёт роль «основной storage-узел сети» — `infra/letar-ipfs/` на s3**
(`188.127.235.141`, PeerId `12D3KooWM7KtRLjqRmJzva7Qy5KZzfaLES4Fk8GgnjabbWoo8A52`, проверено
`docker exec kubo ipfs id` там же 2026-09-08). Это ДРУГОЙ узел с другим PeerId, не переезд этого
пиннера — см. `infra/letar-ipfs/README.md` § «Не путать с» и PLAN-INFRA-3.md §60 (кубо-инстанс
`/opt/letar-ipfs` заведён в git 2026-09-02, задача закрыта целиком).

**`Caddyfile`/`docker-compose.npm.yml` ниже не фронтят ничего на s3.** Проверено вживую
2026-09-08: на s3 нет ни одного контейнера с именем/образом `caddy` (`docker ps -a`), порты
`80`/`443` держит `traefik` (`infra/traefik/`), `ipfs.letar.best` роутится оттуда на `kubo`
(`infra/traefik/dynamic/ipfs.yml`). Домен `ipfsstor3.letar.best`, под который писался Caddy,
нигде в текущей DNS/Traefik-конфигурации не встречается. Файлы оставлены как история —
конкретный пример того, как выглядел HTTPS-терминатор для одиночного VPS-пиннера без NPM/Traefik,
но разворачивать по ним уже нечего.

**`bootstrap-all.sh` обезврежен** (guard в начале скрипта, отказывается запускаться) — адресует
списанный VPS, устаревшие PeerId (`GATEWAY_PEER_ID` в скрипте не совпадает с текущим PeerId
`infra/letar-ipfs/`) и несуществующий уже контейнер `animatrona-gateway` на s2 (гейтвей давно
переехал на s3 как `kubo`, см. §57 «Разделение имён»).

Раздел ниже (оригинальное README) оставлен как история — описывает, как этот пиннер был устроен,
пока сервер существовал: Kubo с патченным PebbleDS-datastore, `server` profile, конфигурация
storage/bitswap. Разворачивать заново по этому README **нельзя** без полной сверки топологии —
адреса, PeerId и порты соседних узлов ниже относятся к сети, которой больше нет в этом виде.

---

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
- **Pin-Queue:** документирован как собираемый из `../animatrona-pin-queue` (build context), host
  network, зависит от healthcheck Kubo — но на 2026-08-08 подтверждено, что этот сервис ни разу
  фактически не разворачивался (образ `animatrona-pinner3-pin-queue:latest` собран только сегодня,
  контейнер из него никогда не поднимался). Реальный работающий на s3 pin-queue — отдельный
  standalone-деплой `/opt/pin-queue` из `infra/animatrona-pin-queue/`, см.
  [§63](/PLAN-INFRA-4.md)

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
4. Собирает и запускает `pin-queue` (`docker compose up -d --build pin-queue`) — ⚠️ этот шаг
   документирован, но на реальном s3 не выполнялся: там pin-queue развёрнут отдельно, standalone
   (см. предупреждение выше и [§63](/PLAN-INFRA-4.md))
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

## ⛔ Реальный прод на s3 живёт вне git

Работающий контейнер `animatrona-pin-queue` на s3 поднят не из этого файла, а из
`/opt/pin-queue/` — ручной копии исходников от 18 июня, без `.git` вообще. Правки в этом
`docker-compose.yml` не доезжают до прода сами по себе — нужен отдельный шаг деплоя на сервер
вручную (через BlackCove). Перепись и план перевода на git —
[PLAN-INFRA-3.md §60](/PLAN-INFRA-3.md).

## Связанные узлы

`infra/animatrona-relay/README.md` (relay), `infra/animatrona-gateway/` (gateway),
`infra/animatrona-pinner/` (pinner1 — на 2026-08-08 не существует физически, см.
[§57](/PLAN-INFRA-3.md), удаление каталога отслеживается там же), `infra/animatrona-pin-queue/`
(сам сервис pin-queue, здесь используется как build-зависимость). Общий дизайн сети — корневой
`PLAN.md` §15.4.

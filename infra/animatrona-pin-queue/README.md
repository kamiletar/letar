# Animatrona Pin-Queue

Go-сервис — очередь пин-заданий поверх Kubo API. Принимает запросы на pin/unpin от трекера,
выполняет `swarm connect` к провайдерам контента перед каждым `pin add` (peering-only сеть, DHT
у пиннеров отключён — без явного connect Kubo не найдёт блоки), хранит состояние заданий в
`state.json`, периодически шлёт heartbeat на relay для регистрации своего PeerId в ACL.

Используется в двух деплоях: как отдельный контейнер рядом с `animatrona-pinner` (pinner1,
`mail.letar.best`) и как build-зависимость `animatrona-pinner3` (`docker-compose.yml` там
собирает этот каталог как `build: context: ../animatrona-pin-queue`).

## Структура

- `cmd/pin-queue/` — entrypoint
- `internal/kubo/` — клиент Kubo HTTP API (bearer-токен)
- `internal/queue/` — очередь заданий, TTL завершённых (`COMPLETED_TTL_HOURS`)
- `internal/relay/` — регистрация/heartbeat на relay-сервере
- `internal/state/` — персистентность состояния (`STATE_PATH`, JSON)

## Переменные окружения

| Переменная            | Назначение                                                                     |
| --------------------- | ------------------------------------------------------------------------------ |
| `BIND_ADDR`           | интерфейс HTTP API, по умолчанию `127.0.0.1` — ⛔ см. предупреждение ниже      |
| `HTTP_PORT`           | порт HTTP API сервиса (по умолчанию `42080`)                                   |
| `KUBO_API_URL`        | адрес Kubo API (`http://localhost:<порт>`)                                     |
| `KUBO_AUTH_TOKEN`     | тот же bearer-токен, что настроен в `API.Authorizations` соответствующего Kubo |
| `AUTH_TOKEN`          | токен авторизации для запросов ОТ трекера К pin-queue                          |
| `STATE_PATH`          | путь к файлу состояния (том, не эфемерно)                                      |
| `COMPLETED_TTL_HOURS` | сколько часов хранить завершённые задания перед очисткой                       |
| `PROVIDER_PEERS`      | multiaddr'а провайдеров контента — `swarm connect` перед pin/add               |
| `RELAY_REGISTER_URL`  | URL `/register` на relay-сервере — heartbeat каждые ~30 мин                    |

### ⛔ `BIND_ADDR` — не менять на `0.0.0.0` без фронта

Сервис работает в `network_mode: host`. Это значит, что слушатель на всех интерфейсах **открыт из
интернета напрямую**: `DOCKER-USER` такой трафик не фильтрует вовсе — он идёт не через `FORWARD`, а
в `INPUT`. То есть обычная защита опубликованных Docker-портов здесь не работает.

Так и было до 2026-08-08: `*:42080` отвечал снаружи на IPv4, а `GET /health` отдавал peer ID Kubo и
состояние очереди **без токена**. Проверено пробой снаружи с двумя контролями, разбор —
[PLAN-INFRA.md §57](/PLAN-INFRA.md).

Нужен доступ извне — ставь перед сервисом обратный прокси с TLS и оставляй `BIND_ADDR` на
loopback. Открывать сам порт наружу нельзя: `AUTH_TOKEN` защищает `/api/*`, но не `/health`.

## Установка (отдельный деплой, напр. рядом с pinner1)

```bash
scp -r infra/animatrona-pin-queue user@mail.letar.best:/path/
cd /path/animatrona-pin-queue
bash setup.sh          # генерирует AUTH_TOKEN, просит вручную заполнить KUBO_AUTH_TOKEN в .env
docker-compose up -d --build
curl http://localhost:42080/health
```

`KUBO_AUTH_TOKEN` должен **совпадать** с токеном, который сгенерировал `setup.sh` соответствующего
Kubo-пиннера (`animatrona-pinner`/`animatrona-pinner3`) — `setup.sh` этого сервиса сам его не
знает, копировать вручную.

При использовании как build-зависимости `animatrona-pinner3` — своего `setup.sh`/`docker-compose`
не запускать, всё конфигурируется через `.env` соседнего `animatrona-pinner3/`.

## Мониторинг

```bash
docker ps | grep animatrona-pin-queue
docker logs -f animatrona-pin-queue
curl http://localhost:42080/health
```

## ⛔ Реальный прод на s3 живёт вне git

Работающий контейнер `animatrona-pin-queue` на s3 поднят не из этого каталога и не из
`animatrona-pinner3/docker-compose.yml`, а из `/opt/pin-queue/` — ручной копии исходников от
18 июня, без `.git` вообще. `git pull` в `letar` его не затрагивает. Перепись и план перевода на
git — [PLAN-INFRA.md §60](/PLAN-INFRA.md). Правка любого файла в этом каталоге требует отдельного
шага деплоя на сервер вручную (через BlackCove), не «запушил — применилось».

⚠️ Раздел «Установка (отдельный деплой, напр. рядом с pinner1)» ниже описывает схему, для которой
на 2026-08-08 не подтверждено, что она когда-либо реально использовалась: pinner1 на
`mail.letar.best` не существует (владелец подтвердил, [§57](/PLAN-INFRA.md)). См. вопрос
владельцу/BlackCove — [PLAN-INFRA.md §63](/PLAN-INFRA.md).

## Связанные узлы

`infra/animatrona-pinner/README.md`, `infra/animatrona-pinner3/README.md` — деплойменты, в
которых используется этот сервис. Общий дизайн сети — корневой `PLAN.md` §15.4.

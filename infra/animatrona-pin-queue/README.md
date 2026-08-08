# Animatrona Pin-Queue

Go-сервис — очередь пин-заданий поверх Kubo API. Принимает запросы на pin/unpin от трекера,
выполняет `swarm connect` к провайдерам контента перед каждым `pin add` (peering-only сеть, DHT
у пиннеров отключён — без явного connect Kubo не найдёт блоки), хранит состояние заданий в
`state.json`, периодически шлёт heartbeat на relay для регистрации своего PeerId в ACL.

Документировано в двух вариантах деплоя, но **реально работает только один**: standalone
`docker-compose.yml` этого каталога, вручную развёрнутый на s3 как `/opt/pin-queue` 18 июня 2026 —
без перерыва работает с тех пор (подтверждено `docker ps`/`docker images` на всех трёх серверах,
[§63](/PLAN-INFRA.md)). Второй вариант — build-зависимость `animatrona-pinner3`
(`docker-compose.yml` там собирает этот каталог как `build: context: ../animatrona-pin-queue`) —
задокументирован, но ни разу фактически не разворачивался: образ существует, но контейнер из него
никогда не поднимался.

Формулировка «рядом с pinner1 на `mail.letar.best`» ниже — устаревшая: pinner1 никогда не
существовал на mail-сервере (ни контейнера, ни образа, [§57](/PLAN-INFRA.md)). Реальный
standalone-деплой стоит рядом с Kubo на s3 (тем же, что и у `animatrona-pinner3`), просто не как
build-зависимость, а как отдельно скопированный каталог.

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

## Установка (реальный путь — standalone рядом с Kubo на s3)

```bash
scp -r infra/animatrona-pin-queue user@<kubo-host>:/path/
cd /path/animatrona-pin-queue
bash setup.sh          # генерирует AUTH_TOKEN, просит вручную заполнить KUBO_AUTH_TOKEN в .env
docker-compose up -d --build
curl http://localhost:42080/health
```

Именно этим путём (не через build-зависимость) 18.06.2026 был развёрнут работающий сейчас на s3
экземпляр — вручную скопирован в `/opt/pin-queue`, без git ([§60](/PLAN-INFRA.md)). Новый деплой
этим способом должен сразу заводиться как git-checkout (sparse или полный), а не `scp`-копией — см.
§60 про то, почему ручное копирование создаёт проблему на годы вперёд.

`KUBO_AUTH_TOKEN` должен **совпадать** с токеном, который сгенерировал `setup.sh` соответствующего
Kubo-пиннера (`animatrona-pinner3`) — `setup.sh` этого сервиса сам его не знает, копировать
вручную.

⚠️ Второй вариант — как build-зависимость внутри `animatrona-pinner3/docker-compose.yml` — описан
в том README, но на 2026-08-08 подтверждено, что он ни разу не запускался как реальный контейнер
([§63](/PLAN-INFRA.md)). Если решите использовать именно его вместо standalone — сначала явно
согласуйте это с владельцем, иначе получите третий, никем не обслуживаемый путь деплоя того же
сервиса.

## Мониторинг

```bash
docker ps | grep animatrona-pin-queue
docker logs -f animatrona-pin-queue
curl http://localhost:42080/health
```

## ⛔ Реальный прод на s3 живёт вне git

Работающий контейнер `animatrona-pin-queue` на s3 (образ `pin-queue-pin-queue:latest`, тот же
compose-проект что этот каталог — подтверждено 2026-08-08) поднят из `/opt/pin-queue/` — ручной
копии этого каталога от 18 июня, без `.git` вообще. `git pull` в `letar` его не затрагивает.
Перепись и план перевода на git — [PLAN-INFRA.md §60](/PLAN-INFRA.md). Правка любого файла здесь
требует отдельного шага деплоя на сервер вручную (через BlackCove), не «запушил — применилось».

## Связанные узлы

`infra/animatrona-pinner/README.md`, `infra/animatrona-pinner3/README.md` — деплойменты, в
которых используется этот сервис. Общий дизайн сети — корневой `PLAN.md` §15.4.

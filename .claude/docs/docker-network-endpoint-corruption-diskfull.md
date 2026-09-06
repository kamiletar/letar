# Диск 100% полон → у части контейнеров рвётся docker-network endpoint (пустой IP), healthcheck это не ловит

⚠️ Класс бага: приложение отдаёт 500 с `getaddrinfo ENOTFOUND <db-host>`, хотя сама БД
`docker ps` показывает как `healthy`, а контейнер с приложением — «просто перезапустить и
пройдёт» не работает с первого раза.

## Симптом

2026-09-06, s2: диск `/` дошёл до 100% (174G/174G). После освобождения места (`docker image
prune`) два приложения из ~20 продолжали отдавать 500:

```
Error: getaddrinfo ENOTFOUND svoichuzhie-db
Error: getaddrinfo ENOTFOUND dsperevod-db
```

При этом `docker ps` показывал `svoichuzhie-db Up 4 weeks (healthy)` — контейнер БД жив,
healthcheck зелёный (он идёт через `pg_isready` **внутри** контейнера, сеть не проверяет).
`docker restart <app>` не помогал — после рестарта приложение снова падало с тем же `ENOTFOUND`.

## Причина

```bash
docker inspect svoichuzhie-db --format '{{json .NetworkSettings.Networks}}'
# → "kami-network": { ..., "IPAddress": "" }
```

У контейнера БД пропал IP в общей docker-сети `kami-network`, хотя сам контейнер числится
`Up`/`healthy`. Docker не смог что-то дозаписать в своё сетевое состояние в момент, когда диск
был на 100% (аналогично тому, как `time-db` в тот же момент реально упал с `failed to mount:
no space left on device`) — но в этом случае процесс Postgres пережил инцидент, а сетевой
endpoint контейнера остался в повреждённом состоянии и сам не восстановился после появления
свободного места.

Встроенный DNS-резолвер Docker (127.0.0.11) резолвит имя контейнера в сети по его
зарегистрированному IP — если тот пуст, отдаёт NXDOMAIN другим контейнерам той же сети. Именно
поэтому `getaddrinfo ENOTFOUND` — это не проблема днс-кэша приложения, а реальное отсутствие
записи на уровне docker-сети.

## Диагностика

Проверить IP всех контейнеров в сети одной командой:

```bash
docker network inspect kami-network --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\n"}}{{end}}'
```

Пустая вторая колонка у конкретного контейнера — это и есть повреждённый endpoint. В инциденте
2026-09-06 из 45 контейнеров сети пострадали ровно 2 — не обязательно предполагать, что диск
на 100% калечит сеть целиком, но стоит прогнать проверку по всем контейнерам, а не полагаться
на выборочные жалобы.

## Фикс

`docker restart` **самого приложения не восстанавливает БД** — сначала нужно пересоздать
endpoint у контейнера БД, только потом рестартовать зависящее приложение:

```bash
docker restart svoichuzhie-db dsperevod-db   # пересоздаёт network endpoint, получает новый IP
docker restart svoichuzhie-app-14 dsperevod-app-11   # пересоздаёт connection pool с валидным DNS
```

Порядок важен: рестарт приложения раньше БД просто воспроизведёт тот же `ENOTFOUND` ещё раз,
потому что endpoint БД всё ещё пуст.

## Как проверить, что причина именно эта

- `docker ps` показывает контейнер `healthy`, но зависящее приложение падает с `ENOTFOUND` на
  его имя — первый сигнал разделения «процесс жив» / «сетевой endpoint жив».
- `docker inspect <container> --format '{{json .NetworkSettings.Networks}}'` — пустой
  `IPAddress` при непустом `NetworkID` подтверждает диагноз.
- Инцидент совпадает по времени с `df -h /` = 100% (или логами `no space left on device` в
  `docker logs`/`docker inspect .State.Error` других контейнеров той же машины).

См. также [docker-prune-cold-layer-network-flake.md](docker-prune-cold-layer-network-flake.md)
— смежный класс проблем «диск/build cache на s2/s3», но другая причинно-следственная цепочка
(там — холодная пересборка и сетевой флейк снаружи, здесь — повреждение внутренней docker-сети).

# Ночной `docker-prune` делает первый деплой дня сетевым — и флейкучим

⚠️ Класс бага: сборка падает «случайно», на шаге, который в норме вообще не касается сети.
Воспроизводится не по коду, а по времени суток.

## Симптом

`docker build` падает на установке пакета из Alpine-репозитория:

```
ERROR: fetching https://dl-cdn.alpinelinux.org/alpine/v3.22/main/x86_64/APKINDEX.tar.gz: TLS: unspecified error
```

Через обычный `docker run` / ручной `apk add` на том же сервере не воспроизводится. Выглядит
как проблема сетевого namespace BuildKit — и это ложный след.

## Что происходит на самом деле

1. `deploy-affected.sh` вызывает `docker build` **без** `--no-cache`. Слой `RUN apk add ...`
   в норме берётся из BuildKit-кэша, сети не касается, стоит ноль секунд.
2. Cron `docker-prune` (`apps/dashboard-agent/src/lib/cron.ts`, `schedule: '0 4 * * *'`)
   ежедневно зовёт `pruneBuilder()`.
3. У build cache практически не бывает «живых» ссылок: замер на s3 2026-08-28 —
   **1107 записей, 76.88 GB, `ACTIVE 0`, `RECLAIMABLE 63.91 GB`**. Прогон без фильтра сносил
   кэш целиком.
4. Поэтому **первый деплой каждого приложения после 04:00** пересобирал базовые слои
   по-настоящему, с реальным запросом к `dl-cdn.alpinelinux.org` (Fastly). При нестабильном
   маршруте из РФ это давало ту самую «случайную» TLS-ошибку.

Частота: ~25 приложений × 1 холодная пересборка в сутки. Не редкость, а системный режим.
2026-08-27 поймано трижды за одну сессию (studio ×2, dsperevod).

## Почему проверки не помогали

- `docker buildx ls` показывает driver `docker` (встроенный BuildKit), без своего
  `--network` и DNS — искать там нечего.
- `/etc/docker/daemon.json` отсутствует, DNS наследуется от хоста, MTU 1500 везде.
- Повторный `docker run --rm node:24-alpine apk add ...` проходит успешно: он идёт по
  прогретому пути и вообще не тот сценарий, который падает.

## Фикс 1 — убрать сетевой запрос из сборки (2026-08-28)

`node:24-alpine` действительно не содержит `/usr/share/zoneinfo` (проверено), поэтому
`ENV TZ=Europe/Moscow` без tzdata молча не работает. Но ставить пакет по сети не обязательно —
zoneinfo можно взять из Debian-образа отдельным stage:

```dockerfile
FROM node:24-slim AS tz

FROM node:24-alpine AS runner
COPY --from=tz /usr/share/zoneinfo /usr/share/zoneinfo
ENV TZ=Europe/Moscow
```

`node:24-slim` — tagged-образ, поэтому ежедневный `pruneImages()` его не удаляет: он вызван
без `dangling: false`, то есть чистит только untagged. Размер zoneinfo — 3.9 MB, примерно
столько же весил и пакет `tzdata`.

Применено к 22 файлам `apps/*/Dockerfile.production`.

⚠️ Два места намеренно оставлены с `apk add`: `apps/dashboard` и `apps/dashboard-agent` ставят
`docker-cli`, `git`, `openssh-client` — для них сеть при сборке нужна по существу, и тот же
флейк там по-прежнему возможен.

## Фикс 2 — не сносить горячий build cache

`pruneBuilder()` из dockerode фильтры **не поддерживает**: его `PruneBuilderOptions` содержит
только `abortSignal`, а сам метод собирает запрос к `/build/prune` без query-параметров
(`dockerode/lib/docker.js`). Поэтому фильтр приходится передавать через `docker.modem.dial`
напрямую:

```ts
docker.modem.dial({ path: `/build/prune?filters=${...{ until: ['168h'] }}`, method: 'POST', ... })
```

Порог настраивается через `DOCKER_PRUNE_BUILDER_KEEP_HOURS` (по умолчанию 168 часов).

⚠️ Компромисс: прунинг завели не от скуки — 2026-08-14 диск s2 доходил до 91 %. Держать
неделю build cache при 76 GB на s3 может оказаться слишком щедро. Если диск снова начнёт
подпирать, крутить нужно именно эту переменную, а не возвращать чистку без фильтра.

## Как проверить, что причина именно эта

```bash
docker system df          # смотреть строку Build Cache: ACTIVE и RECLAIMABLE
```

Если `ACTIVE 0` при десятках гигабайт — весь кэш подлежит удалению при первом же
безфильтровом прунинге, и любой сетевой шаг в Dockerfile становится ежедневным.

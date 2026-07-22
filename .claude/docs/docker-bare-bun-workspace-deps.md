# Docker-сборка bare Bun/Node-сервисов с внутренними `@letar/*`-зависимостями

Касается приложений, которые собираются в Docker **не** через Next.js `output: 'standalone'`
(там трассировка зависимостей и копирование `node_modules` берёт на себя Next), а вручную —
изолированным `bun install` только по своему `package.json` (пример: `dashboard-agent`,
`Dockerfile.production`). Если такое приложение зависит от внутреннего непубликуемого
`@letar/*`-пакета (`private: true` в `libs/*/package.json`, например `@letar/email`) —
изолированный `bun install` бьёт мимо: пытается зарезолвить пакет с публичного npm registry и
падает `404`, даже если версия в `package.json` синтаксически корректна.

## Симптом

```
error: GET https://registry.npmjs.org/@letar%2femail - 404
error: @letar/email@^0.3.0 failed to resolve
```

## Root cause

`Dockerfile` копирует только `apps/<app>/package.json` (для скорости и минимального образа —
осознанный выбор, не баг), поэтому `bun install` не видит корневой `package.json` с полем
`workspaces` и резолвит зависимости с npm registry как обычный внешний пакет.

## Фикс — синтетический мини-workspace в builder-стейдже

```dockerfile
FROM base AS builder
RUN npm install -g bun

# Копируем внутренние либы, от которых зависит приложение, + его package.json
COPY libs/email ./libs/email
COPY apps/dashboard-agent/package.json ./apps/dashboard-agent/package.json

# Синтетический root package.json — bun найдёт "workspaces" и зарезолвит @letar/email
# из локальной ./libs/email, а не с npm
RUN printf '{"name":"docker-build","private":true,"workspaces":["apps/dashboard-agent","libs/email"]}' > package.json

RUN bun install
```

**И** сама зависимость в `package.json` приложения должна быть `"workspace:*"`, не semver-диапазон:

```json
"@letar/email": "workspace:*"
```

Semver-диапазон (`^0.3.0`) — неправильный протокол для внутренней монорепо-зависимости в любом
случае, даже вне Docker-контекста: он сигнализирует «резолвь с registry», bun просто иногда
успевает найти локальную копию по совпадению версии в обычном (не изолированном) `bun install`.

## Побочные грабли, которые вскрываются вместе с этим фиксом

Как только `bun install` реально начинает резолвить пакет из монорепо (а не молча падать раньше),
всплывают ещё три независимых, но смежных бага — все воспроизведены и починены на примере
`dashboard-agent` + `@letar/email` (2026-07-22):

### 1. Фантомные зависимости

Если внутренняя либа импортирует пакет, который не объявлен в её `dependencies` (потому что в
полном монорепо-`node_modules` он случайно хостится транзитивно от чего-то другого) — в
изолированном мини-workspace транзитивной подложки нет, и `bun build` падает на
`Could not resolve: "<package>"`. Фикс — явно добавить пакет в `dependencies` либы.

### 2. Опциональные нативные зависимости в Alpine-билдере

`bun build` (бандлер) пытается статически заинлайнить `require(...)`, даже если он обёрнут в
`try/catch` для опциональности (частый паттерн у нативных биндингов — `cpu-features` у `ssh2`,
транзитивно от `dockerode`). Alpine-образ без `python3`/`make`/`g++` не может собрать нативный
аддон → пакета физически нет на диске → бандлер падает `File not found`.

Проверить перед фиксом, что require реально guarded:

```js
try {
  cpuInfo = require('cpu-features')()
} catch {}
```

Если да — безопасно исключить из бандла:

```bash
bun build ... --external cpu-features
```

### 3. Относительные symlink'и bun-воркспейса ломаются при плоском копировании

В bun-воркспейсе top-level символические ссылки прямых зависимостей приложения лежат не в
корневом `node_modules`, а во **вложенном** `apps/<app>/node_modules/<pkg>` — с
**относительным** путём, рассчитанным под эту глубину (`../../../node_modules/.bun/<pkg>/...`).

Это стреляет только для пакетов, которые загружаются **динамически по имени в рантайме** (не
инлайнятся статическим бандлом) — например, `pino` подгружает `pino-pretty` как отдельный
worker-модуль через `require.resolve('pino-pretty')` уже в контейнере, а не на этапе `bun build`.
Симптом:

```
Error: unable to determine transport target for "pino-pretty"
```

Если прод-стейдж копирует `node_modules` в другую глубину вложенности (например, сплющивает всё
в один `/app/node_modules`), относительные symlink'и указывают мимо цели.

**Фикс** — сохранить исходную вложенность целиком, не сплющивать:

```dockerfile
# outdir нарочно вложенный (apps/<app>/dist), не плоский ./dist — на той же глубине, что и
# apps/<app>/node_modules, иначе относительные symlink'и bun ломаются
RUN bun build ./apps/<app>/src/index.ts --outdir=./apps/<app>/dist --target=node --external cpu-features

# production-стейдж — копируем ОБЕ директории node_modules как есть
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/<app>/node_modules ./apps/<app>/node_modules
COPY --from=builder /app/apps/<app>/dist ./apps/<app>/dist

CMD ["node", "apps/<app>/dist/index.js"]
```

## Чеклист при добавлении нового `@letar/*`-пакета в bare Bun/Node Docker-сервис

1. Зависимость в `package.json` — `"workspace:*"`, не semver-диапазон.
2. `Dockerfile` копирует саму либу (`COPY libs/<lib> ./libs/<lib>`) + генерирует синтетический
   root `package.json` с `workspaces`, охватывающий и приложение, и либу.
3. Проверить `dependencies` либы на полноту — реальной Docker-сборкой, не только `nx lint`/
   `typecheck` (они резолвят через TS project references, не через `bun install` в изоляции).
4. Если сборка падает на native-биндинге — проверить, что `require` guarded try/catch, и
   исключить через `--external`.
5. Копировать `dist`/`node_modules` в прод-стейдж **на той же глубине вложенности**, что была в
   builder-стейдже — не сплющивать в один уровень.
6. Проверить локально: `docker build` → `docker run` → `curl /health` (или эквивалент) до пуша.

## Где это применялось

`apps/dashboard-agent/Dockerfile.production` + `@letar/email` (2026-07-22) — см.
`apps/dashboard-agent/PLAN_COMPLETED.md` для полной хронологии находки.

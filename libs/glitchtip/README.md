# @letar/glitchtip

Тонкая обёртка над `@sentry/node`/`@sentry/browser` для отправки ошибок в самостоятельно
развёрнутый GlitchTip (см. `infra/glitchtip/`, PLAN-INFRA.md §70). GlitchTip Sentry-совместим,
поэтому используются официальные Sentry SDK — DSN просто указывает на другой сервер.

Не `@sentry/nextjs`: это два изолированных подпакета (`./server`, `./client`), включаемые через
нативные хуки Next.js 16 (`instrumentation.ts`/`instrumentation-client.ts`) без webpack/Turbopack
плагина `@sentry/nextjs` — меньше поверхности, которая может разойтись с бандлером, и не нужен
кастомный `next.config` wrapper. Цена: без автоматической загрузки sourcemaps (см. `infra/glitchtip/README.md`
§«Что не сделано») и без Sentry-специфичных фич вроде session replay — на момент подключения первого
приложения (studio) они не были нужны.

## Установка

Библиотека уже включена в монорепозиторий.

## API

### `./server` — `initServer({ dsn, environment })`

Вызывать из `instrumentation.ts` → `register()`, только при `NEXT_RUNTIME === 'nodejs'`
(`@sentry/node` не работает в edge-рантайме).

### `./server` — `captureRequestError`

Готовый обработчик с сигнатурой `Instrumentation.onRequestError` — реэкспортировать как есть:

```ts
// instrumentation.ts
import type { Instrumentation } from 'next'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initServer } = await import('@letar/glitchtip/server')
    initServer({ dsn: process.env.GLITCHTIP_DSN, environment: process.env.GLITCHTIP_ENVIRONMENT ?? 'development' })
  }
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { captureRequestError } = await import('@letar/glitchtip/server')
    await captureRequestError(...args)
  }
}
```

### `./client` — `initClient({ dsn, environment })`

Вызывать из `instrumentation-client.ts` на верхнем уровне модуля (не в функции — см. доку Next.js
по этому файлу, код должен быть синхронным до гидратации):

```ts
// instrumentation-client.ts
import { initClient } from '@letar/glitchtip/client'

initClient({
  dsn: process.env.NEXT_PUBLIC_GLITCHTIP_DSN,
  environment: process.env.NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT ?? 'development',
})
```

`NEXT_PUBLIC_`-префикс обязателен для клиентской переменной — иначе Next.js не инлайнит её в
браузерный бандл, и `dsn` будет `undefined` в проде.

### `.` — `scrubPii(event)`

Общий `beforeSend`-мутатор: убирает `user.ip_address` и `request.cookies`/`authorization`-заголовки
перед отправкой — часть приложений монорепо работает под операторами ПДн
([personal-data.md](/.claude/docs/personal-data.md)). Уже вызывается внутри `initServer`/`initClient`,
экспортируется отдельно только для тестов/переиспользования в кастомном `beforeSend`.

## Переменные окружения приложения

| Переменная                          | Где                            | Секрет?                                                                        |
| ----------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `GLITCHTIP_DSN`                     | `docker-compose.*.yml`, сервер | Нет — тот же DSN, что и у клиента, ключ проекта не даёт доступа к чужим данным |
| `NEXT_PUBLIC_GLITCHTIP_DSN`         | `docker-compose.*.yml`, клиент | Нет                                                                            |
| `GLITCHTIP_ENVIRONMENT`             | сервер                         | Нет                                                                            |
| `NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT` | клиент                         | Нет                                                                            |

DSN не секрет (как и у настоящего Sentry — ключ предназначен именно для клиентского бандла),
поэтому все четыре можно держать литералом прямо в `docker-compose.*.yml`, без похода через
`.env.docker.enc`.

## Команды

```bash
nx typecheck:tsgo glitchtip
nx lint glitchtip
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/glitchtip` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/glitchtip` резолвится и без настроек приложения.

Для подпутей `./server`/`./client` дополнительно нужны отдельные строки в `paths` его
`tsconfig.json` — см. [libs.md](/.claude/rules/libs.md#подключение-к-приложению) и
[lib-entry-points.md](/.claude/docs/lib-entry-points.md).

Дальше — создать `src/instrumentation.ts` и `src/instrumentation-client.ts` по образцу выше и
прописать четыре переменные окружения в `docker-compose.*.yml` приложения (значения — реальный
DSN, см. `infra/glitchtip/README.md` § «Подключённые приложения» или GlitchTip UI → Settings →
Client Keys нужного проекта).

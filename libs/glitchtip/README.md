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

### `./server` — `captureException(err)`

Для бэкендов без Next.js (Fastify/Express/CLI) — вызывать из своего error-хука после
`initServer()`. `captureRequestError` (выше) — Next.js-специфичная сигнатура
`Instrumentation.onRequestError`, эта функция для всего остального:

```ts
// src/index.ts (Fastify, см. dashboard-agent)
import { captureException, initServer } from '@letar/glitchtip/server'

initServer({ dsn: process.env.GLITCHTIP_DSN, environment: process.env.GLITCHTIP_ENVIRONMENT ?? 'development' })

fastify.addHook('onError', async (_request, _reply, error) => {
  captureException(error)
})
```

`onError` — наблюдающий хук (не подменяет ответ клиенту), в отличие от `setErrorHandler`.
Не-Next.js приложения не проходят через генератор (`nx g @letar/generators:glitchtip-integrate`
рассчитан на `apps/<app>/package.json` + `instrumentation.ts`) — путь + `paths` в `tsconfig.json`
и запись в `package.json`/`project.json` (`dependencies`/`implicitDependencies`) добавляются
руками, `bun install` после — обязателен (создаёт symlink в `node_modules/@letar/`).

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

| Переменная                          | Где    | Секрет?                                                                        |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `GLITCHTIP_DSN`                     | сервер | Нет — тот же DSN, что и у клиента, ключ проекта не даёт доступа к чужим данным |
| `NEXT_PUBLIC_GLITCHTIP_DSN`         | клиент | Нет                                                                            |
| `GLITCHTIP_ENVIRONMENT`             | сервер | Нет                                                                            |
| `NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT` | клиент | Нет                                                                            |

DSN не секрет (как и у настоящего Sentry — ключ предназначен именно для клиентского бандла), но
⚠️ **обе `NEXT_PUBLIC_*`-переменные всё равно нельзя держать литералом в `docker-compose.*.yml`** —
Next.js инлайнит `NEXT_PUBLIC_*` в клиентский бандл на этапе `nx build`, который выполняется ДО
`docker compose up` и до литерала в compose-файле физически не добирается. Все четыре — в
`apps/<app>/.env.docker`/`.env.docker.enc` (прод) и `.env.staging` (staging), а
`docker-compose.*.yml` читает их через `${VAR}`:

```yaml
environment:
  GLITCHTIP_DSN: ${GLITCHTIP_DSN}
  GLITCHTIP_ENVIRONMENT: ${GLITCHTIP_ENVIRONMENT}
  NEXT_PUBLIC_GLITCHTIP_DSN: ${NEXT_PUBLIC_GLITCHTIP_DSN}
  NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT: ${NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT}
```

Найдено и исправлено на живом инциденте (`studio`, 2026-08-11, PLAN-INFRA.md §70) — клиентские
ошибки на проде молча не долетали до GlitchTip несколько часов после первого деплоя, пока
серверные доходили исправно. Полный разбор класса бага (не специфичного для GlitchTip — касается
любой `NEXT_PUBLIC_*`) —
[nextjs-public-env-build-time-inlining.md](/.claude/docs/nextjs-public-env-build-time-inlining.md).

## Команды

```bash
nx typecheck:tsgo glitchtip
nx lint glitchtip
```

## Подключение к приложению

⚡ **Не делай это вручную — используй генератор** (PLAN-INFRA.md §70 п.8):

```bash
nx g @letar/generators:glitchtip-integrate <app>
```

Делает 5 из 6 шагов ниже автоматически и идемпотентно (повторный запуск ничего не портит):
instrumentation-файлы (не перезаписывает, если файл уже занят другой логикой — печатает снипет для
ручного слияния), `package.json` (`dependencies` + `nx.implicitDependencies`), `tsconfig.json`
(три `paths`), `.env.docker`/`.env.staging` (+ `.example`) через `${VAR}`, `docker-compose.*.yml`
через точечную текстовую вставку `${VAR}` — литералом написать физически не может, поэтому баг
из инцидента `studio` (см. ниже) для новых приложений структурно исключён. Не автоматизирован
намеренно только шаг 1 (создание проекта в GlitchTip UI) — генератор не хранит админ-токен
GlitchTip. Приватные submodule (коммерческие/ПДн-приложения) генератор отклоняет по умолчанию —
см. PLAN-INFRA.md §70 п.5, обход `--allowPrivate` только после осознанного решения об изоляции.

Ручной процесс ниже — то, что генератор делает под капотом, для справки/отладки его вывода.

Обязательное — одно: добавь `@letar/glitchtip` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/glitchtip` резолвится и без настроек приложения.

Для подпутей `./server`/`./client` дополнительно нужны отдельные строки в `paths` его
`tsconfig.json` — см. [libs.md](/.claude/rules/libs.md#подключение-к-приложению) и
[lib-entry-points.md](/.claude/docs/lib-entry-points.md).

Дальше — создать `src/instrumentation.ts` и `src/instrumentation-client.ts` по образцу выше и
прописать четыре переменные в `.env.docker`/`.env.staging` приложения (не в `docker-compose.*.yml`
литералом — см. предупреждение выше), значения — реальный DSN, см. `infra/glitchtip/README.md`
§ «Подключённые приложения» или GlitchTip UI → Settings →
Client Keys нужного проекта).

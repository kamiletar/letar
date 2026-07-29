# MCP ↔ браузер через SSE-мост (Next.js API-роуты)

Паттерн для случая, когда **отдельный MCP-сервер** (stdio-процесс, работает вне
Next.js) должен управлять состоянием открытой в браузере страницы — например,
подсвечивать параметр в UI, проигрывать демо-патч, гасить секции интерфейса.
Впервые реализован в `apps/synth` (Фаза 2, коммиты `ebbf83bc`, `d2c4c2e7`).
Остальные MCP-серверы монорепо (`libs/form-mcp`, `libs/deploy-mcp`) — обычные
stdio-инструменты без обратного канала в браузер, так что этот паттерн больше
нигде не задокументирован.

## Архитектура

MCP-процесс (`nx run synth:mcp:serve`) не может напрямую тронуть DOM или React-стейт
браузера — это отдельный Node-процесс без доступа к странице. Мост — обычные
Next.js API-роуты внутри того же приложения:

```
MCP-процесс (stdio) --HTTP POST--> /api/mentor/emit  --EventEmitter--> /api/mentor/events (SSE) --> браузер
```

- `POST /api/mentor/emit/` — принимает событие от MCP-клиента, публикует в общую шину.
- `GET /api/mentor/events/` — держит SSE-поток (`ReadableStream` +
  `export const dynamic = 'force-dynamic'`), транслирует события подписанным браузерам.
- Оба роута читают/пишут общий in-memory `EventEmitter` — процесс-локальная шина,
  без Redis/БД. Годится для одного пользователя студии, горизонтальное
  масштабирование не нужно.

Образец шины — [event-bus.ts](/apps/synth/src/lib/mentor/event-bus.ts):

```typescript
const globalForMentorBus = globalThis as unknown as { __synthMentorBus?: EventEmitter }
const bus = globalForMentorBus.__synthMentorBus ?? new EventEmitter()
bus.setMaxListeners(50)
globalForMentorBus.__synthMentorBus = bus

export function publishMentorEvent(event: MentorEvent): void {
  bus.emit('mentor-event', event)
}

export function subscribeMentorEvents(listener: (event: MentorEvent) => void): () => void {
  bus.on('mentor-event', listener)
  return () => bus.off('mentor-event', listener)
}
```

SSE-роут — [route.ts](/apps/synth/src/app/api/mentor/events/route.ts):

```typescript
export const dynamic = 'force-dynamic'

export function GET() {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeMentorEvents((event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      })
      // cancel() отписывается — см. полный файл
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
```

Эмит-роут — [route.ts](/apps/synth/src/app/api/mentor/emit/route.ts) — валидирует
тело Zod-схемой, проверяет авторизацию и зовёт `publishMentorEvent`.

MCP-сервер дёргает эмит-роут обычным `fetch` из
[mentor-client.ts](/apps/synth/src/mcp/mentor-client.ts) — единственная связь
между MCP-процессом и Next.js.

## Ловушка №1 — `globalThis` вместо module-scope синглтона

Обычная `const bus = new EventEmitter()` на уровне модуля **не гарантированно**
один и тот же объект между разными `route.ts` в dev-режиме Turbopack: каждый
роут теоретически может скомпилироваться как отдельная точка входа со своей
копией модуля. Тогда `/api/mentor/emit` и `/api/mentor/events` подписываются
на разные шины, и событие никуда не долетает.

Решение — тот же паттерн, что кэш ORM-клиента в `apps/*/src/lib/db.ts`: держать
инстанс на `globalThis`, а не в module-scope переменной (см. код шины выше).

## Ловушка №2 — гонка авто-reconnect `EventSource` при живой отладке

`EventSource` в браузере автоматически переподключается после разрыва (штатное
поведение спецификации, с задержкой). Если во время отладки часто перезапускать
dev-сервер между правками и сразу слать событие через `curl`, оно может прилететь
в окно, пока подписка ещё не переустановилась — теряется без следа, потому что
шина fire-and-forget, без буфера для поздних подписчиков.

Симптом выглядит как «код не работает», хотя на самом деле не работает только
методика проверки. Правило: при живой проверке SSE не дёргать сервер рестартами
между шагами, проверять эффект в браузере сразу после `emit`, не после серии
других действий.

## Ловушка №3 — `trailingSlash: true` и внутренние запросы

Если у приложения включён `trailingSlash: true` в `next.config`, все внутренние
`fetch`/`EventSource` пути обязаны заканчиваться слэшем — иначе Next отдаёт `308`
редирект, который в `curl` выглядит как что-то похожее на нужный ответ, а не как
редирект. См. `/api/mentor/emit/` и `/api/mentor/events/` с завершающим слэшем в
[mentor-client.ts](/apps/synth/src/mcp/mentor-client.ts) и
[use-mentor-events.ts](/apps/synth/src/app/_components/studio/use-mentor-events.ts).

## Ловушка №4 — top-level `await` в CJS-транспиляции MCP CLI

Если MCP-сервер запускается через `bunx tsx`, а само приложение (Next.js) не
объявляет `"type": "module"` в `package.json`, esbuild/tsx транспилирует `cli.ts`
в CJS — top-level `await` там не работает. Решение — обернуть запуск в
`async function main() { ... }; void main()`:

```typescript
// apps/synth/src/mcp/cli.ts
async function main() {
  const server = createSynthMcpServer({ baseUrl, token, patchesDir, name: '@letar/synth-mcp', version: '1.0.0' })
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

void main()
```

## Когда применять этот паттерн

Когда MCP-инструменту нужно **толкать** событие в уже открытую страницу браузера
(а не просто отвечать на запрос клиента). Если MCP-серверу достаточно читать
состояние по запросу без пуша — обычный HTTP GET-эндпоинт без SSE проще и без
описанных выше ловушек.

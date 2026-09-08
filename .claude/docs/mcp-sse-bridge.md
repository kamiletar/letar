# MCP ↔ браузер через SSE-мост (Next.js API-роуты)

Паттерн для случая, когда **отдельный MCP-сервер** (stdio-процесс, работает вне
Next.js) должен управлять состоянием открытой в браузере страницы — например,
подсвечивать параметр в UI, проигрывать демо-патч, гасить секции интерфейса.
Впервые реализован в `apps/synth` (Фаза 2, коммиты `ebbf83bc`, `d2c4c2e7`) —
там один пользователь и широковещательная рассылка. Второй прецедент —
`apps/domwellbes/src/lib/assist/` (коммит `e3d4027`, 2026-09-08) — админка с
несколькими одновременно работающими сотрудниками, где broadcast-модель
`synth` ломается по существу, не по мелочи (см. раздел «Несколько
одновременных сессий» ниже). Остальные MCP-серверы монорепо (`libs/form-mcp`,
`libs/deploy-mcp`) — обычные stdio-инструменты без обратного канала в браузер.

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

## Несколько одновременных сессий

`apps/synth` — один пользователь студии, поэтому в
[event-bus.ts](/apps/synth/src/lib/mentor/event-bus.ts) одна общая шина и
`bus.emit()` уходит всем подписчикам сразу. `apps/domwellbes` — админка,
за которой одновременно работают несколько сотрудников, и та же
broadcast-модель там ломается не по мелочи, а по существу. Реестр —
[registry.ts](/apps/domwellbes/src/lib/assist/registry.ts).

1. **Команда обязана уходить в конкретную вкладку, не всем.** Подсветка
   «нажми сюда», адресованная одному сотруднику, при broadcast мигнёт на
   экране другого посреди его собственной работы. В `registry.ts` подписчики
   и рассылка команд адресуются по `tabId` (`subscribe(tabId, listener)`,
   `sendCommand(tabId, build)`) — карта `sessions: Map<tabId, ...>`, а не
   один `EventEmitter` на всех. Тест — «команда уходит только в свою вкладку»
   в [registry.spec.ts](/apps/domwellbes/src/lib/assist/registry.spec.ts).

2. **Ожидание ответа обязано быть ограничено по времени.** Мост здесь не
   fire-and-forget, как в synth, а pull-through-push: MCP шлёт команду и ждёт
   ack от браузера, прежде чем ответить своему вызывающему. Без таймаута
   ожидание висит вечно на закрытой или уснувшей вкладке — инструмент MCP не
   вернёт управление. В `registry.ts` — `REQUEST_TIMEOUT_MS = 5_000` и явный
   `{ ok: false, detail: '...' }` по истечении; тест — «резолвится ошибкой по
   таймауту, а не висит вечно» в `registry.spec.ts`.

3. **Подтверждение обязано нести идентификатор вкладки, а не только
   `requestId`.** У `synth` этой проблемы нет — пользователь один, подменять
   ack некому. У `domwellbes` браузер одного сотрудника мог бы зарезолвить
   `requestId` команды, адресованной другому (подсмотренный или угаданный
   id). На момент написания этого раздела фикс спроектирован, но ещё не
   внедрён в код: `AssistAckSchema` в
   [types.ts](/apps/domwellbes/src/lib/assist/types.ts) поля `tabId` не
   несёт — план и порядок правки записаны как «Шаг A» в
   [docs/ASSISTANT_IMPLEMENTATION.md](/apps/domwellbes/docs/ASSISTANT_IMPLEMENTATION.md)
   этого приложения («делать первым, до остального»). Заводя третий
   прецедент моста с несколькими сессиями — проверять по коду, довели ли
   этот шаг до конца, не доверять формулировке здесь.

4. **Проверка токена MCP-канала — fail-open или fail-closed зависит от
   того, что лежит за каналом.** В `apps/synth`
   [auth.ts](/apps/synth/src/lib/mentor/auth.ts) — «нет переменной окружения,
   значит доверенный контур» (`if (!expected) return true`): для локального
   синтезатора одного пользователя это осознанное упрощение, не оплошность.
   В `apps/domwellbes`
   [auth.ts](/apps/domwellbes/src/lib/assist/auth.ts) сделано наоборот —
   `isAuthorizedAssistRequest` отдаёт `false`, если `ASSIST_MCP_SECRET` не
   задан — потому что за каналом лежат сделки, сметы и персональные данные
   клиентов, и забытая переменная открыла бы чтение экранов админки любому,
   кто знает адрес (тот же класс риска, что `ALLOW_DEV_SESSION`, см.
   [env-files.md](/.claude/rules/env-files.md)). Выбор между fail-open и
   fail-closed для нового моста — не дефолт, а решение под конкретный канал:
   fail-open годится только для локального однопользовательского инструмента
   без чувствительных данных за ним.

⚠️ **В `libs/` пока не выносить.** Два прецедента расходятся по существу
(broadcast одному пользователю vs адресация по `tabId` нескольким), а
правило репозитория про общий примитив — «при 3+ местах» (`shared-first` в
корневом `CLAUDE.md`). Извлекать сейчас означало бы абстрагировать по одному
образцу расхождения — рано. Следующему агенту, который наткнётся на третий
прецедент: сначала сверить, какая из двух моделей (или третья) ему подходит,
и только потом думать про общий код.

## Когда применять этот паттерн

Когда MCP-инструменту нужно **толкать** событие в уже открытую страницу браузера
(а не просто отвечать на запрос клиента). Если MCP-серверу достаточно читать
состояние по запросу без пуша — обычный HTTP GET-эндпоинт без SSE проще и без
описанных выше ловушек.

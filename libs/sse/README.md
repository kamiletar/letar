# @letar/sse

Общий серверный каркас для SSE-эндпоинтов (Server-Sent Events) Next.js Route Handler,
построенных на периодическом опросе (БД, in-memory состояние и т.п.) — heartbeat-комментарий,
опрос по интервалу, необязательный таймаут автозакрытия, единая очистка ресурсов при `cancel()`
потока и при `request.signal` 'abort'.

Не годится для событийных (pub/sub) SSE-эндпоинтов, где данные приходят асинхронно от внешнего
источника (менеджер подписки, callback) — там нечего опрашивать по таймеру.

## Установка

```bash
npm i @letar/sse@beta
```

Peer-зависимостей нет: используются только Web API (`Request`, `Response`, `ReadableStream`).

```typescript
import { createPollingSseResponse, SSE_HEADERS } from '@letar/sse'
```

## API

### `createPollingSseResponse(options)`

```typescript
export async function GET(request: Request, { params }: { params: Promise<{ streamToken: string }> }) {
  const { streamToken } = await params
  const email = await resolveStreamToken('verification', streamToken)
  if (!email) {
    return new Response('Not found', { status: 404 })
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { emailVerified: true } })
  if (!user) {
    return new Response('Not found', { status: 404 })
  }

  // Уже готово — сразу одно событие без открытия потока
  if (user.emailVerified) {
    return new Response(`data: ${JSON.stringify({ verified: true })}\n\n`, { headers: SSE_HEADERS })
  }

  return createPollingSseResponse({
    request,
    intervalMs: 2000,
    heartbeatMs: 15_000,
    timeoutMs: 5 * 60 * 1000,
    poll: async (emit) => {
      const current = await prisma.user.findUnique({ where: { email }, select: { emailVerified: true } })
      if (current?.emailVerified) {
        emit({ verified: true })
        return 'done'
      }
    },
  })
}
```

Параметры:

- `request` — исходный `Request`; на его `signal` вешается очистка ресурсов при disconnect клиента.
- `poll(emit)` — вызывается на каждом тике `intervalMs` (и один раз сразу при
  `runPollImmediately: true`). Через `emit(data, event?)` можно отправить 0 и более событий за
  один вызов: без `event` — обычный `data: ...` (клиент видит его как `message`), с `event` —
  `event: <имя>\ndata: ...`. Возврат `'done'` закрывает поток сразу после этого вызова.
  Исключение внутри `poll` проглатывается — это временный сбой одного тика, не повод рвать поток;
  обрабатывай ожидаемые ошибки внутри `poll` сам, если нужно другое поведение (например, превратить
  ошибку в событие с флагом `error`).
- `intervalMs` — интервал опроса.
- `heartbeatMs` — интервал heartbeat-комментария `: heartbeat\n\n` (не задан — heartbeat не шлётся).
- `timeoutMs` — автозакрытие потока (не задан — поток живёт, пока клиент не отключится).
- `runPollImmediately` — вызвать `poll` сразу при открытии, не дожидаясь первого тика интервала.
- `headers` — заголовки поверх `SSE_HEADERS` (например `X-Accel-Buffering: 'no'` для Nginx).

### `SSE_HEADERS`

Базовые заголовки (`Content-Type: text/event-stream`, `Cache-Control: no-cache`,
`Connection: keep-alive`) — те же, что `createPollingSseResponse` подставляет по умолчанию.
Используй их и для «уже готового» раннего ответа без потока (см. пример выше).

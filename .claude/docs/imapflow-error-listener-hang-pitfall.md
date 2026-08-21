# ImapFlow: слушатель `'error'` не спасает от зависшего `await`

Слушатель на событие `'error'` у `ImapFlow` обязателен — без него необработанный `error` на
`EventEmitter` роняет весь процесс. Но одного слушателя **недостаточно**: он защищает от
падения процесса, а не от зависшего вызова.

## Почему слушателя мало

`ImapFlow` эмитит `'error'` асинхронно при обрыве/таймауте сокета — не всегда как reject уже
начатого `await`, а иногда **вместо** него. Если ошибка происходит во время `client.connect()`
или итерации `client.fetch()`, этот `await` может повиснуть навсегда: слушатель перехватит
`error` и запишет её в переменную, но код, ждущий `await`, об этом не узнает и никогда не
получит управление обратно.

```typescript
// ❌ Недостаточно — процесс не падает, но при зависшем сокете await не вернётся никогда
let clientError: Error | null = null
client.on('error', (error) => {
  clientError = error instanceof Error ? error : new Error(String(error))
})

await client.connect() // может повиснуть навсегда, если error пришёл вместо reject
```

## Фикс — общий helper `withImapDeadline` (`@letar/email`)

Найденный независимо в двух местах монорепо ручной `Promise.race` (см. «Прецеденты» ниже)
вынесен в [`libs/email/src/imap-deadline.ts`](/libs/email/src/imap-deadline.ts) —
`withImapDeadline(client, work, opts)`. Он берёт на себя весь механизм: слушатель `'error'`,
гонку с жёстким таймаутом и безусловный `client.close()` после неё. Вызывающий код отвечает
только за создание клиента и за саму IMAP-операцию (`work`):

```typescript
import { withImapDeadline } from '@letar/email'

const hardDeadlineMs = POLL_TIMEOUT_MS + 15_000

return withImapDeadline(
  client,
  (getClientError) => doImapWorkInner(client, getClientError),
  {
    timeoutMs: hardDeadlineMs,
    onTimeout: (clientError) =>
      failedResult(
        clientError?.message ?? `IMAP-операция не завершилась за ${hardDeadlineMs}мс (зависший сокет)`,
      ),
  },
)
```

Внутри самой операции (`doImapWorkInner`) дополнительно стоит проверять `getClientError()` в
точках между IMAP-командами (например на каждой итерации poll-цикла) — это даёт более быстрый
и точный выход, чем ожидание внешнего дедлайна, но не заменяет его: дедлайн — единственная
гарантия возврата управления за конечное время, если проверка `getClientError()` не попадёт в
нужный момент.

## Прецеденты

Найдено независимо в двух местах монорепо, оба раза как отдельный фикс после инцидента с
зависшим/упавшим процессом — вынесено в общий helper 2026-08-22 (§ выше):

- [`apps/dashboard-agent/src/lib/email-canary.ts`](/apps/dashboard-agent/src/lib/email-canary.ts)
  (`waitForCanaryMessage`) — инцидент 2026-07-21, без слушателя `'error'` процесс
  `dashboard-agent` падал целиком; внешний дедлайн добавлен отдельным фиксом позже.
- `apps/domwellbes/src/lib/logistics/rfq-email-poll.ts` (`pollRfqEmailReplies`, приватный
  submodule) — фикс 2026-08-22, тот же приём применён превентивно со ссылкой на инцидент
  dashboard-agent, до того как ошибка успела воспроизвестись здесь же.

## Как не наступить снова

Любой новый код, создающий `ImapFlow`-клиент напрямую, обязан обернуть операцию
`withImapDeadline` (`@letar/email`) — она уже реализует все три пункта защиты (слушатель
`'error'`, гонка с жёстким дедлайном, безусловный `client.close()`). Писать свой ручной
`Promise.race` заново не нужно — только если сценарий не укладывается в сигнатуру helper-а
(тогда обязательны те же три пункта вручную).

Третьего места с прямым использованием `ImapFlow` в монорепо на 2026-08-22 нет — если
появится, использовать `withImapDeadline` сразу, не дожидаясь собственного инцидента.

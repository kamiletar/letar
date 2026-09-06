# ⚠️ `getRedis()` возвращает клиент, ещё не готовый принять команду

**Класс бага:** фабрика отдаёт объект, который выглядит рабочим, но его первая же команда
отклоняется — потому что соединение ещё открывается. Не «Redis недоступен», а «Redis доступен,
но не в этой миллисекунде».

Найдено 2026-09-06 на s2 (dashboard-agent, разбор ниже). Это **ловушка второго порядка** к фиксу
2026-08-08 из [`with-timeout.ts`](/apps/dashboard-agent/src/lib/with-timeout.ts) — тот фикс был
верным, и возвращать его назад не нужно.

## Симптом

При каждом старте процесса в логах:

```
[deploy] Не удалось восстановить историю деплоя из Redis: Error: Stream isn't writeable and enableOfflineQueue options is false
[Cron] Не удалось восстановить логи выполнения из Redis: Error: Stream isn't writeable and enableOfflineQueue options is false
```

Через доли секунды Redis отвечает нормально — записи пишутся, читаются, всё «работает».

## Механизм

`createRedisClient` из [`@letar/redis-client`](/libs/redis-client/src/lib/redis-client.ts) создаёт
клиент с `lazyConnect: true` и вызывает `client.connect()` **не дожидаясь результата**:

```ts
client = new Redis(url, { lazyConnect: true, enableOfflineQueue: false, ... })
client.connect().catch(() => { connectionFailed = true })
return client                       // ← отдаётся немедленно, status === 'connecting'
```

Дальше складываются две вещи, каждая из которых по отдельности правильная:

1. `getRedis()` возвращает **не-null** клиент — проверка `if (!r) return` его пропускает;
2. `enableOfflineQueue: false` не даёт команде подождать в очереди — она отклоняется сразу.

Замерено на живом Redis: сразу после `getRedis()` статус клиента — `connecting`, и `lrange`
в этот момент падает с ровно той ошибкой, что в проде.

## Почему `try/catch` не спас, хотя ошибка ловилась

Ловилась и логировалась честно. Не было **повторной попытки** — а восстановление состояния
бывает ровно один раз за жизнь процесса. Дальше:

- в памяти остаётся пустое состояние;
- первый же новый персист перезаписывает индекс в Redis;
- прежние данные исчезают безвозвратно.

⚠️ **Отказ тихий и выглядит как здоровый сервис.** Приложение поднялось, отвечает, метрики
зелёные. В dashboard-agent это всплыло только вторичным симптомом: агент деплоит сам себя, и
после self-deploy `deploy_status` отвечал `Deploy <id> not found in history`, затем `No deploys
yet` — статус собственного деплоя приходилось добивать через SSH.

## Чего делать НЕ надо

⛔ **Не возвращать `enableOfflineQueue: true`.** Соблазн понятный — очередь как раз и дождалась бы
готовности. Но именно она 2026-08-08 уронила dashboard-agent на s3 в crash loop: при недоступном
Redis команда не падает и не завершается **никогда** (`retryStrategy` переподключается бесконечно),
Fastify убивает плагин по `AVV_ERR_PLUGIN_EXEC_TIMEOUT`. Размен «зависание → быстрый отказ» верен.
Недостающей была не очередь, а **порядок**: не отправлять команду до готовности.

⛔ **Не полагаться на `!== null` как на признак готовности.** Единственный контракт `getRedis()` —
«Redis сконфигурирован», не «Redis отвечает прямо сейчас».

## Решение

Дождаться события `ready`, **ограничив ожидание по времени** — приложение обязано подниматься при
полностью лежащем Redis:

```ts
export async function waitForRedisReady(client: RedisClient, timeoutMs: number): Promise<boolean> {
  if (client.status === 'ready') { return true }
  if (client.status === 'end') { return false // connect() провалился, переподключения не будет
   }

  return new Promise((resolve) => {
    let settled = false
    const finish = (ready: boolean) => {
      if (settled) { return }
      settled = true
      clearTimeout(timer)
      client.off('ready', onReady)
      client.off('end', onEnd)
      resolve(ready)
    }
    const onReady = () => finish(true)
    const onEnd = () => finish(false)
    const timer = setTimeout(() => finish(false), timeoutMs)
    client.once('ready', onReady)
    client.once('end', onEnd)
  })
}
```

Референс-реализация вместе с обёрткой `getRedisWhenReady(label, timeoutMs)` —
[`apps/dashboard-agent/src/lib/redis.ts`](/apps/dashboard-agent/src/lib/redis.ts), тесты —
`redis.spec.ts` рядом.

### ⚠️ Бюджет времени: внешний таймаут обязан быть больше внутреннего

Если стартовый вызов уже обёрнут в `withTimeout` (а он должен быть — см. доктрину
`with-timeout.ts`), то при **равных** значениях внешний таймаут срабатывает ровно в момент
готовности клиента и снова теряет состояние — тот же симптом, другая причина. В dashboard-agent
внутренний `REDIS_READY_TIMEOUT_MS = 3000`, внешний — `REDIS_READY_TIMEOUT_MS + 2000`.

## Кого это касается ещё

Механизм живёт в общей библиотеке `@letar/redis-client`, а не в одном приложении. Но бьёт он
только по **чтению на пути старта процесса** — то есть по паттерну «восстановить состояние из
Redis при запуске». Обычные потребители (кеш, rate-limit) читают Redis в обработчике запроса,
когда клиент давно `ready`, и этой гонки не видят.

Правило: **любое чтение из Redis, выполняемое до начала обслуживания трафика, обязано
дождаться `ready`** — либо через `getRedisWhenReady`, либо повтором с бэкоффом. Одной попытки
недостаточно, и `try/catch` вокруг неё создаёт ложное ощущение, что случай обработан.

## Как проверять, что починено

Юнит-тестов мало: они проверяют хелпер, но не сам факт гонки. Дешёвая живая проверка —
поднять throwaway Redis, засеять данными и в **одном процессе** сравнить оба пути:

```
СТАРЫЙ путь: status клиента сразу после getRedis() = "connecting"
СТАРЫЙ путь: ОШИБКА: Stream isn't writeable and enableOfflineQueue options is false
НОВЫЙ путь (13мс): история деплоев: 2 записей, логи cron: 1 записей
```

Отдельно — проверка обратной стороны размена: при **недоступном** Redis старт занимает ровно
`REDIS_READY_TIMEOUT_MS` и дальше не блокируется, предупреждение печатается один раз (второй
вызов уходит мгновенно — в `@letar/redis-client` уже взведён флаг `connectionFailed`).

## Смежное

- [`with-timeout.ts`](/apps/dashboard-agent/src/lib/with-timeout.ts) — инцидент 2026-08-08,
  из которого выросло `enableOfflineQueue: false`, и доктрина «сетевой вызов на пути старта
  приложения обязан иметь границу по времени».
- [verification-pitfalls](/.claude/docs/verification-pitfalls.md) — тот же класс: проверка,
  которая врёт в успокаивающую сторону (ошибка залогирована → «случай обработан»).

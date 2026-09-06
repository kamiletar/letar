/**
 * Redis клиент для dashboard-agent — используется для персистентности deploy-истории
 * (routes/deploy.ts) и логов cron-задач (lib/cron.ts). Graceful degradation через
 * @letar/redis-client: без REDIS_URL или при недоступном Redis оба места продолжают работать
 * чисто в памяти процесса, как раньше.
 *
 * Оценка унификации (2026-07-30, dashboard-agent-dev): у routes/deploy.ts и lib/cron.ts на
 * первый взгляд один и тот же паттерн «ring-buffer в памяти → best-effort персист в Redis →
 * rehydrate при старте → пометка running-записей как interrupted/error», но формы хранения
 * расходятся по существу, а не случайно:
 * - deploy.ts: один плоский глобальный ring-buffer (MAX_DEPLOY_HISTORY деплоев суммарно),
 *   каждый элемент — свой ключ (`deploy:item:<id>`), индекс — LIST (порядок важен), персист
 *   построчного output дебаунсится (1с) отдельно от flush при завершении.
 * - cron.ts: N независимых ring-buffer (по MAX_LOGS_PER_JOB на jobId), каждый jobId — один
 *   ключ с целым JSON-массивом логов (`cron:logs:<jobId>`), индекс — SET job-id (порядок не
 *   нужен), персист немедленный на каждый addLog/updateLog без дебаунса.
 *
 * Общий generic-хелпер (`createRedisBackedHistory<T>`) пришлось бы параметризовать по
 * indexType (list/set), по гранулярности ключа (один ключ на элемент vs один ключ на группу
 * элементов) и по стратегии персиста (дебаунс vs немедленно) — на двух потребителях это не
 * сокращает код, а прячет реальную разницу за конфигом. Решение: не абстрагировать сейчас.
 * Возвращаться к вопросу — когда появится третий Redis-backed ring-buffer с формой хранения,
 * совпадающей с одним из этих двух вариантов (не раньше).
 */

import { createRedisClient } from '@letar/redis-client'

export const getRedis = createRedisClient({ logPrefix: '[redis]' })

// =============================================================================
// Ожидание готовности клиента перед первой командой
// =============================================================================

/** Тип клиента выводим из фабрики: `ioredis` не является прямой зависимостью
 * dashboard-agent (приходит транзитивно через `@letar/redis-client`) и под изолированным
 * линкером bun из этого пакета не резолвится — прямой `import type ... from 'ioredis'`
 * здесь не соберётся. */
type RedisClient = NonNullable<ReturnType<typeof getRedis>>

/**
 * Сколько ждать перехода клиента в `ready` при старте процесса. Меньше внешней границы
 * `withTimeout` у вызывающего — так остаётся запас на сами команды чтения.
 */
export const REDIS_READY_TIMEOUT_MS = 3000

/**
 * Ждёт, пока клиент перейдёт в состояние `ready`. Возвращает `false`, если не дождались
 * за `timeoutMs` или соединение окончательно закрылось (`end`).
 *
 * Вынесено отдельно от `getRedisWhenReady` ради тестируемости: сюда можно передать любой
 * объект с `status` + семантикой событий ioredis, не поднимая настоящий Redis.
 */
export async function waitForRedisReady(client: RedisClient, timeoutMs: number): Promise<boolean> {
  if (client.status === 'ready') {
    return true
  }
  // `end` — connect() провалился и переподключения не будет; ждать нечего
  if (client.status === 'end') {
    return false
  }

  return new Promise<boolean>((resolve) => {
    let settled = false

    const finish = (ready: boolean): void => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      client.off('ready', onReady)
      client.off('end', onEnd)
      resolve(ready)
    }

    const onReady = (): void => finish(true)
    const onEnd = (): void => finish(false)

    const timer = setTimeout(() => finish(false), timeoutMs)

    client.once('ready', onReady)
    client.once('end', onEnd)
  })
}

/**
 * Клиент, гарантированно готовый принять команду, — или `null`, если Redis не настроен
 * либо не поднялся за отведённое время.
 *
 * ⚠️ Зачем это нужно вообще (инцидент 2026-09-06, s2). `createRedisClient` работает в режиме
 * `lazyConnect: true` и вызывает `connect()` **не дожидаясь результата** — поэтому `getRedis()`
 * отдаёт клиент, у которого сокет ещё только открывается. Вместе с `enableOfflineQueue: false`
 * (осознанный выбор после инцидента 2026-08-08, см. `with-timeout.ts`) это даёт гонку: команда,
 * отправленная в этом окне, немедленно отклоняется с
 * `Stream isn't writeable and enableOfflineQueue options is false`.
 *
 * Обе функции восстановления состояния (`rehydrateFromRedis` истории деплоев и
 * `rehydrateExecutionLogsFromRedis` логов cron) вызываются на старте процесса — то есть ровно
 * в этом окне. Их `try/catch` честно ловил ошибку и писал её в лог, но **повторной попытки не
 * было**: через полсекунды Redis уже отвечал, а состояние в памяти оставалось пустым и
 * затиралось первым же новым персистом. Практическое следствие — после self-deploy агента
 * `deploy_status` отвечал `No deploys yet` на собственный только что прошедший деплой.
 *
 * Обрати внимание, что предыдущий фикс не был ошибочным: он менял бесконечное зависание на
 * быстрый отказ, и это по-прежнему правильный размен. Недостающая часть — не отправлять
 * команду до готовности, а не возвращать офлайн-очередь обратно.
 *
 * Ожидание ограничено по времени: агент обязан подниматься при полностью лежащем Redis
 * (доктрина `with-timeout.ts`), поэтому «не дождались» — это штатный исход, а не ошибка.
 */
export async function getRedisWhenReady(
  label: string,
  timeoutMs: number = REDIS_READY_TIMEOUT_MS,
): Promise<RedisClient | null> {
  const client = getRedis()
  // Redis не настроен (нет REDIS_URL) — штатный режим работы без него, молчим
  if (!client) {
    return null
  }

  const ready = await waitForRedisReady(client, timeoutMs)
  if (!ready) {
    // Ровно одна строка на вызов: обе функции восстановления вызываются по разу за старт
    // процесса, цикла здесь быть не может
    console.warn(`[redis] ${label}: клиент не перешёл в ready за ${timeoutMs}мс — продолжаем без Redis`)
    return null
  }

  return client
}

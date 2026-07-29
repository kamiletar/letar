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

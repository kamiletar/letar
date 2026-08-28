/**
 * Redis-персистентность истории деплоев (best-effort, graceful degradation без Redis —
 * см. lib/redis.ts). Ring-buffer сам живёт в lib/deploy-history.ts — этот модуль только
 * пишет/читает его снапшоты, не владеет массивом.
 */

import type { DeployStatus } from './deploy-history'
import { getRedis } from './redis'

const REDIS_KEY_PREFIX = 'dashboard-agent:deploy:'
const REDIS_INDEX_KEY = `${REDIS_KEY_PREFIX}index`
// TTL с запасом сверх разумного времени жизни записи — подстраховка от рассинхрона
// индекса и элементов, а не основной механизм ограничения размера (для этого MAX_DEPLOY_HISTORY)
const REDIS_ITEM_TTL_SEC = 7 * 24 * 60 * 60

function redisItemKey(deployId: string): string {
  return `${REDIS_KEY_PREFIX}item:${deployId}`
}

/** Немедленный best-effort персист снапшота одного деплоя */
export async function persistDeploy(deploy: DeployStatus): Promise<void> {
  const r = getRedis()
  if (!r) {
    return
  }
  try {
    await r.set(redisItemKey(deploy.deployId), JSON.stringify(deploy), 'EX', REDIS_ITEM_TTL_SEC)
  } catch {
    // Не критично — следующий персист (debounce/flush) попробует снова
  }
}

/** Перезаписывает индекс порядка deployId целиком (список короткий — до MAX_DEPLOY_HISTORY) */
export async function persistIndex(deployHistory: readonly DeployStatus[]): Promise<void> {
  const r = getRedis()
  if (!r) {
    return
  }
  try {
    const ids = deployHistory.map((d) => d.deployId)
    const pipeline = r.pipeline()
    pipeline.del(REDIS_INDEX_KEY)
    if (ids.length > 0) {
      pipeline.rpush(REDIS_INDEX_KEY, ...ids)
      pipeline.expire(REDIS_INDEX_KEY, REDIS_ITEM_TTL_SEC)
    }
    const runPipeline = pipeline.exec.bind(pipeline)
    await runPipeline()
  } catch {
    // Не критично
  }
}

// Debounce персиста лога: appendOutput может вызываться построчно на каждый chunk
// stdout/stderr — пишем в Redis не чаще раза в секунду на деплой, а не на каждую строку
const PERSIST_DEBOUNCE_MS = 1000
const pendingPersists = new Map<string, ReturnType<typeof setTimeout>>()

export function schedulePersist(deploy: DeployStatus): void {
  const existing = pendingPersists.get(deploy.deployId)
  if (existing) {
    clearTimeout(existing)
  }
  pendingPersists.set(
    deploy.deployId,
    setTimeout(() => {
      pendingPersists.delete(deploy.deployId)
      void persistDeploy(deploy)
    }, PERSIST_DEBOUNCE_MS),
  )
}

/** Немедленный персист в обход debounce — вызывать при завершении/значимых переходах статуса */
export function flushPersist(deploy: DeployStatus): void {
  const existing = pendingPersists.get(deploy.deployId)
  if (existing) {
    clearTimeout(existing)
    pendingPersists.delete(deploy.deployId)
  }
  void persistDeploy(deploy)
}

/**
 * Восстанавливает deployHistory из Redis при старте процесса. Записи, застигнутые
 * в состоянии running=true (агент перезапустился, пока деплой шёл) помечаются
 * interrupted — реальный исход неизвестен: nsenter-процесс на хосте физически может
 * быть жив (см. host-exec.ts), но dashboard-agent потерял currentProcess и больше не
 * получает от него stdout/exit code напрямую.
 *
 * Мутирует переданный deployHistory на месте (push) — массивом владеет lib/deploy-history.ts,
 * этот модуль только заполняет его при старте.
 */
export async function rehydrateFromRedis(deployHistory: DeployStatus[]): Promise<void> {
  const r = getRedis()
  if (!r) {
    return
  }
  try {
    const ids = await r.lrange(REDIS_INDEX_KEY, 0, -1)
    if (ids.length === 0) {
      return
    }
    const items = await r.mget(...ids.map(redisItemKey))
    for (const raw of items) {
      if (!raw) {
        continue
      }
      try {
        const deploy = JSON.parse(raw) as DeployStatus
        // Записи, персистированные до §38 (нет phases в Redis) — бэкфилл пустым массивом.
        deploy.phases = deploy.phases ?? []
        if (deploy.running) {
          deploy.running = false
          deploy.interrupted = true
          deploy.error = deploy.error
            ?? 'Dashboard-agent перезапустился во время этого деплоя — итоговый статус неизвестен'
          deploy.endTime = deploy.endTime ?? new Date().toISOString()
        }
        deployHistory.push(deploy)
      } catch {
        // Битая запись в Redis — пропускаем
      }
    }
    if (deployHistory.length > 0) {
      console.warn(`[deploy] Восстановлено ${deployHistory.length} записей истории деплоя из Redis`)
    }
  } catch (err) {
    console.error('[deploy] Не удалось восстановить историю деплоя из Redis:', err)
  }
}

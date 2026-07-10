/**
 * Pin Queue Poller — отправка CID на удалённые пинеры и проверка статуса
 *
 * Интегрируется с pin-queue сервисом (mail.letar.best:42080).
 * После подтверждения пинирования обновляет PinStatus → PINNED_REMOTE,
 * что позволяет безопасно освобождать место в локальном Kubo.
 *
 * API pin-queue:
 *   POST /api/pin          { cid, name? }   → поставить в очередь
 *   GET  /api/status?cid=  → { status: 'pending'|'pinned'|'failed', ... }
 *   DELETE /api/pin?cid=   → убрать из очереди
 *   GET  /health           → { ok: true }
 */

import { prisma } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'
import { markAsFailed, markAsPinnedRemote, markAsQueued } from './pin-status-service'

const log = createModuleLogger('PinQueuePoller')

// Настройки pin-queue (из MEMORY.md)
const PIN_QUEUE_URL = 'http://mail.letar.best:42080'
const PIN_QUEUE_AUTH = '38de32e136617e39634c74a31d75c3d9e795d6c3fb82b6b75d626bd0bf250f85'

/** Статус возвращаемый pin-queue API */
type PinQueueStatus = 'pending' | 'pinning' | 'pinned' | 'failed' | 'unknown'

interface PinQueueStatusResponse {
  cid: string
  status: PinQueueStatus
  error?: string
  pinnedAt?: string
}

// ─── Отправка в очередь ───────────────────────────────────────────────────────

/**
 * Отправить CID в pin-queue для пинирования на удалённом сервере.
 * Обновляет PinStatus → PIN_QUEUED.
 *
 * @throws При недоступности pin-queue (сеть, auth)
 */
export async function queueRemotePin(cid: string, name?: string): Promise<void> {
  log.debug('Отправка CID в pin-queue', { cid, name })

  const response = await fetch(`${PIN_QUEUE_URL}/api/pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PIN_QUEUE_AUTH}`,
    },
    body: JSON.stringify({ cid, name }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`pin-queue error ${response.status}: ${body}`)
  }

  await markAsQueued(cid)
  log.debug('CID в очереди пинирования', { cid })
}

/**
 * Поставить несколько CID в очередь пинирования.
 * Продолжает при ошибках отдельных CID.
 */
export async function queueRemotePins(cids: string[], name?: string): Promise<{ queued: number; failed: number }> {
  let queued = 0
  let failed = 0

  for (const cid of cids) {
    try {
      await queueRemotePin(cid, name)
      queued++
    } catch (error) {
      log.warn('Не удалось поставить CID в очередь', { cid, error: String(error) })
      await markAsFailed(cid, String(error))
      failed++
    }
  }

  log.info('Отправлено в pin-queue', { queued, failed, total: cids.length })
  return { queued, failed }
}

// ─── Проверка статуса ─────────────────────────────────────────────────────────

/**
 * Проверить статус конкретного CID в pin-queue.
 */
export async function checkRemotePinStatus(cid: string): Promise<PinQueueStatusResponse> {
  try {
    const response = await fetch(`${PIN_QUEUE_URL}/api/status?cid=${encodeURIComponent(cid)}`, {
      headers: { Authorization: `Bearer ${PIN_QUEUE_AUTH}` },
      signal: AbortSignal.timeout(5_000),
    })

    if (response.status === 404) {
      return { cid, status: 'unknown' }
    }
    if (!response.ok) {
      return { cid, status: 'unknown' }
    }

    const data = (await response.json()) as PinQueueStatusResponse
    return { cid, status: data.status ?? 'unknown', error: data.error, pinnedAt: data.pinnedAt }
  } catch {
    return { cid, status: 'unknown' }
  }
}

/**
 * Поллинг всех PIN_QUEUED CID — обновляет статусы по ответам pin-queue.
 *
 * Вызывать периодически (например, каждые 5 минут).
 * CID с подтверждённым пином → PINNED_REMOTE (безопасно для GC).
 */
export async function pollPinQueueStatus(): Promise<{
  confirmed: number
  failed: number
  pending: number
}> {
  const queued = await prisma.pinStatus.findMany({
    where: { status: 'PIN_QUEUED' },
    select: { cid: true },
  })

  if (queued.length === 0) {
    return { confirmed: 0, failed: 0, pending: 0 }
  }

  log.info('Проверка статуса PIN_QUEUED CID', { count: queued.length })

  let confirmed = 0
  let failed = 0
  let pending = 0

  for (const { cid } of queued) {
    const result = await checkRemotePinStatus(cid)

    if (result.status === 'pinned') {
      await markAsPinnedRemote(cid)
      confirmed++
    } else if (result.status === 'failed') {
      await markAsFailed(cid, result.error ?? 'pin-queue: failed')
      failed++
    } else {
      // pending / pinning / unknown — ждём
      pending++
    }
  }

  if (confirmed > 0 || failed > 0) {
    log.info('Статусы обновлены после поллинга', { confirmed, failed, pending })
  }

  return { confirmed, failed, pending }
}

// ─── Проверка доступности ─────────────────────────────────────────────────────

/**
 * Проверить доступность pin-queue сервера.
 */
export async function checkPinQueueHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${PIN_QUEUE_URL}/health`, {
      signal: AbortSignal.timeout(3_000),
    })
    return response.ok
  } catch {
    return false
  }
}

// ─── Удаление из очереди ──────────────────────────────────────────────────────

/**
 * Убрать CID из pin-queue (если передумали пинировать).
 */
export async function cancelRemotePin(cid: string): Promise<void> {
  const response = await fetch(`${PIN_QUEUE_URL}/api/pin?cid=${encodeURIComponent(cid)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${PIN_QUEUE_AUTH}` },
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => '')
    throw new Error(`pin-queue cancel error ${response.status}: ${body}`)
  }

  log.debug('CID убран из очереди пинирования', { cid })
}

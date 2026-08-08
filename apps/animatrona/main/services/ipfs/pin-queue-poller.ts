/**
 * Pin Queue Poller — отправка CID на удалённые пинеры и проверка статуса
 *
 * Интегрируется с pin-queue сервисом (`ipfsstor4.letar.best`, сам сервис на s3).
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

/**
 * Адрес pin-queue.
 *
 * ⚠️ Раньше здесь стоял `http://mail.letar.best:42080` — **неверный сервер**. Сам сервис живёт на
 * s3 (PLAN-INFRA.md §57), а на почтовом сервере порт `42080` не слушает никто: перепись хостовых
 * слушателей mail 2026-08-08 дала `25/465/587/993` (maddy), `80/81/443` (прокси), `4001`/`41080`
 * (relay), `22`. Публичный вход в pin-queue — `ipfsstor4.letar.best` через прокси на s3.
 *
 * Плюс схема была `http`, то есть токен уходил открытым текстом.
 */
const PIN_QUEUE_URL = process.env.PIN_QUEUE_URL ?? 'https://ipfsstor4.letar.best'

/**
 * Токен доступа к pin-queue. Берётся из окружения и **не имеет значения по умолчанию**.
 *
 * ⛔ Раньше он был вписан в этот файл строкой. Файл лежит в публичном репозитории с первого
 * коммита (2026-05-16), поэтому тот токен считается скомпрометированным и подлежит ротации —
 * удаление из кода само по себе его не отзывает, история остаётся.
 *
 * ⚠️ Само по себе вынесение в переменную окружения проблему **не решает**: приложение
 * распространяется установщиком через GitHub Releases, и любой общий серверный секрет, попавший в
 * сборку, доступен каждому, кто её скачал. Правильное устройство — не давать клиенту серверный
 * секрет вовсе (запрос на пиннинг идёт через бэкенд трекера, где сессия пользователя уже есть).
 * Разбор — PLAN-INFRA.md §61.
 */
export function pinQueueAuthToken(): string {
  const token = process.env.PIN_QUEUE_AUTH_TOKEN
  if (!token) {
    // Fail closed: отправлять заведомо неверный токен — значит получить в ответ 401, неотличимый
    // от настоящей проблемы авторизации, и потерять причину «секрета негде взять» (тот же урок,
    // что в PLAN-INFRA.md §52).
    throw new Error(
      'PIN_QUEUE_AUTH_TOKEN не задан — запрос к pin-queue не отправлен. '
        + 'Токен выдаётся отдельно и в сборку не зашивается (PLAN-INFRA.md §61).',
    )
  }
  return token
}

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
      Authorization: `Bearer ${pinQueueAuthToken()}`,
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
      headers: { Authorization: `Bearer ${pinQueueAuthToken()}` },
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
    headers: { Authorization: `Bearer ${pinQueueAuthToken()}` },
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => '')
    throw new Error(`pin-queue cancel error ${response.status}: ${body}`)
  }

  log.debug('CID убран из очереди пинирования', { cid })
}

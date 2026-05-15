/**
 * Сервис пиннинга IPFS контента.
 *
 * Поддерживает два режима:
 * 1. Pin-Queue сервис (рекомендуемый) — через HTTP API с прогрессом блоков
 * 2. Kubo RPC API напрямую (fallback) — fire-and-forget без прогресса
 *
 * Режим определяется полем `pinQueueUrl` в PinServer:
 * - Если заполнено → используется pin-queue API
 * - Если пусто → прямой вызов Kubo API
 */

import { prisma } from './db'

// ============================================================================
// Типы
// ============================================================================

/** Результат операции пиннинга */
interface PinResult {
  success: boolean
  error?: string
}

/** Запись статуса из pin-queue */
interface PinQueueEntry {
  cid: string
  id?: string
  status: 'queued' | 'pinning' | 'pinned' | 'failed'
  progressBlocks: number
  error?: string
  createdAt: string
  startedAt?: string
  finishedAt?: string
}

// ============================================================================
// Pin-Queue API (рекомендуемый режим)
// ============================================================================

/** Заголовки авторизации для pin-queue */
function pinQueueHeaders(secret?: string | null): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (secret) {
    headers['Authorization'] = `Bearer ${secret}`
  }
  return headers
}

/** Отправить CID в pin-queue */
async function pinQueueAdd(
  pinQueueUrl: string,
  cid: string,
  jobId: string,
  secret?: string | null,
): Promise<PinResult> {
  try {
    const response = await fetch(`${pinQueueUrl}/api/pin`, {
      method: 'POST',
      headers: pinQueueHeaders(secret),
      body: JSON.stringify({ cid, id: jobId }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Unknown error' }))
      return { success: false, error: data.error || `HTTP ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
  }
}

/** Удалить CID из pin-queue (распинить) */
async function pinQueueRemove(pinQueueUrl: string, cid: string, secret?: string | null): Promise<PinResult> {
  try {
    const response = await fetch(`${pinQueueUrl}/api/pin?cid=${encodeURIComponent(cid)}`, {
      method: 'DELETE',
      headers: pinQueueHeaders(secret),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Unknown error' }))
      return { success: false, error: data.error || `HTTP ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
  }
}

/** Получить статус всех заданий из pin-queue */
async function pinQueueStatus(
  pinQueueUrl: string,
  secret?: string | null,
): Promise<{ entries: PinQueueEntry[]; error?: string }> {
  try {
    const response = await fetch(`${pinQueueUrl}/api/status`, {
      method: 'GET',
      headers: pinQueueHeaders(secret),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return { entries: [], error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    return { entries: data.queue || [] }
  } catch (error) {
    return { entries: [], error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
  }
}

// ============================================================================
// Kubo RPC API (fallback)
// ============================================================================

/** Заголовки авторизации для Kubo API */
function kuboHeaders(authSecret?: string | null): HeadersInit {
  if (!authSecret) {
    return {}
  }
  return { Authorization: `Bearer ${authSecret}` }
}

/**
 * Отправить CID на пиннинг в Kubo (fire-and-forget).
 * Fallback для серверов без pin-queue.
 */
export async function kuboPinAddAsync(kuboApiUrl: string, cid: string, authSecret?: string | null): Promise<PinResult> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    // progress=true — Kubo начинает стримить прогресс, а мы сразу закрываем соединение.
    // Kubo продолжает пиннинг в фоне (проверено: pin/add продолжается даже после disconnect).
    const response = await fetch(`${kuboApiUrl}/api/v0/pin/add?arg=${encodeURIComponent(cid)}&progress=true`, {
      method: 'POST',
      headers: kuboHeaders(authSecret),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      return { success: false, error: `HTTP ${response.status}: ${text}` }
    }

    // Закрываем соединение, Kubo продолжает пиннинг в фоне
    controller.abort()
    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: true }
    }
    return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
  }
}

/**
 * Добавить CID в пиннинг через Kubo RPC API (синхронный).
 * Используется для маленьких файлов (манифесты и т.д.).
 */
export async function kuboPinAdd(
  kuboApiUrl: string,
  cid: string,
  authSecret?: string | null,
  timeout = 60000,
): Promise<PinResult> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${kuboApiUrl}/api/v0/pin/add?arg=${encodeURIComponent(cid)}&progress=false`, {
      method: 'POST',
      headers: kuboHeaders(authSecret),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      return { success: false, error: `HTTP ${response.status}: ${text}` }
    }

    const data = await response.json()
    if (data.Pins && Array.isArray(data.Pins)) {
      return { success: true }
    }

    return { success: false, error: `Неожиданный ответ: ${JSON.stringify(data)}` }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Таймаут запроса' }
    }
    return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
  }
}

/** Удалить CID из пиннинга через Kubo RPC API */
export async function kuboPinRm(
  kuboApiUrl: string,
  cid: string,
  authSecret?: string | null,
  timeout = 30000,
): Promise<PinResult> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${kuboApiUrl}/api/v0/pin/rm?arg=${encodeURIComponent(cid)}`, {
      method: 'POST',
      headers: kuboHeaders(authSecret),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      if (text.includes('not pinned')) {
        return { success: true }
      }
      return { success: false, error: `HTTP ${response.status}: ${text}` }
    }

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Таймаут запроса' }
    }
    return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
  }
}

/** Проверить, запинен ли CID на Kubo ноде */
export async function kuboPinLs(
  kuboApiUrl: string,
  cid?: string,
  authSecret?: string | null,
  timeout = 10000,
): Promise<{ pinned: boolean; type?: string; error?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const url = cid
      ? `${kuboApiUrl}/api/v0/pin/ls?arg=${encodeURIComponent(cid)}&type=all`
      : `${kuboApiUrl}/api/v0/pin/ls?type=all`

    const response = await fetch(url, {
      method: 'POST',
      headers: kuboHeaders(authSecret),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      if (text.includes('not pinned')) {
        return { pinned: false }
      }
      return { pinned: false, error: `HTTP ${response.status}: ${text}` }
    }

    const data = await response.json()
    if (data.Keys && cid && data.Keys[cid]) {
      return { pinned: true, type: data.Keys[cid].Type }
    }

    return { pinned: !cid }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { pinned: false, error: 'Таймаут запроса' }
    }
    return { pinned: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
  }
}

// ============================================================================
// Основные функции (автоматически выбирают pin-queue или Kubo)
// ============================================================================

/**
 * Создать задание на пиннинг.
 *
 * Если у сервера настроен pinQueueUrl — отправляет в pin-queue с отслеживанием прогресса.
 * Иначе — fire-and-forget через Kubo API.
 */
export async function createPinJob(
  cid: string,
  serverId: string,
  createdById: string,
  animeId?: string,
): Promise<{ jobId: string; success: boolean; error?: string }> {
  const server = await prisma.pinServer.findUnique({ where: { id: serverId } })
  if (!server) {
    return { jobId: '', success: false, error: 'Сервер не найден' }
  }
  if (server.status !== 'ONLINE') {
    return { jobId: '', success: false, error: `Сервер ${server.name} недоступен (${server.status})` }
  }

  // Проверяем существующее задание
  const existingJob = await prisma.pinJob.findUnique({
    where: { cid_serverId: { cid, serverId } },
  })

  if (existingJob && existingJob.status === 'PINNED') {
    return { jobId: existingJob.id, success: true }
  }

  const job = existingJob
    ? await prisma.pinJob.update({
      where: { id: existingJob.id },
      data: { status: 'PINNING', error: null, progressBlocks: 0 },
    })
    : await prisma.pinJob.create({
      data: {
        cid,
        serverId,
        createdById,
        animeId,
        status: 'PINNING',
      },
    })

  // Выбираем способ пиннинга: pin-queue или Kubo напрямую
  const result = server.pinQueueUrl
    ? await pinQueueAdd(server.pinQueueUrl, cid, job.id, server.pinQueueSecret)
    : await kuboPinAddAsync(server.apiUrl, cid, server.authSecret)

  if (!result.success) {
    await prisma.pinJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', error: result.error || null },
    })
    return { jobId: job.id, success: false, error: result.error }
  }

  return { jobId: job.id, success: true }
}

/**
 * Синхронизировать статусы заданий.
 *
 * Для серверов с pin-queue — один запрос GET /api/status, обновляет progressBlocks.
 * Для серверов без pin-queue — N × pin/ls (без прогресса).
 */
export async function syncPinJobStatuses(): Promise<{
  synced: number
  pinned: number
  errors: number
  retried: number
}> {
  const jobs = await prisma.pinJob.findMany({
    where: { status: { in: ['PINNING', 'QUEUED'] } },
    include: { server: true },
  })

  let synced = 0
  let pinned = 0
  let errors = 0
  let retried = 0

  // Порог для auto-retry: если задание висит без прогресса > 10 минут — повторить запрос
  const STALE_THRESHOLD_MS = 10 * 60 * 1000
  const now = Date.now()

  // Группируем по серверам для эффективности
  const jobsByServer = new Map<string, typeof jobs>()
  for (const job of jobs) {
    const existing = jobsByServer.get(job.serverId) || []
    existing.push(job)
    jobsByServer.set(job.serverId, existing)
  }

  for (const [, serverJobs] of jobsByServer) {
    const server = serverJobs[0].server

    // Если сервер OFFLINE — пометить задания как FAILED для auto-retry на другом сервере
    if (server.status === 'OFFLINE') {
      for (const job of serverJobs) {
        await prisma.pinJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', error: `Сервер ${server.name} недоступен (OFFLINE)` },
        })
        errors++
        synced++
      }
      continue
    }

    if (server.pinQueueUrl) {
      // Pin-queue: один запрос для всех CID сервера
      const { entries, error } = await pinQueueStatus(server.pinQueueUrl, server.pinQueueSecret)

      if (error) {
        errors += serverJobs.length
        continue
      }

      // Индексируем по CID для быстрого поиска
      // При дубликатах CID: pinned побеждает всегда (CID уже на сервере), далее pinning > queued > failed
      const STATUS_PRIORITY: Record<string, number> = { pinned: 4, pinning: 3, queued: 2, failed: 1 }
      const entryByCid = new Map<string, PinQueueEntry>()
      for (const e of entries) {
        const existing = entryByCid.get(e.cid)
        if (!existing || (STATUS_PRIORITY[e.status] ?? 0) > (STATUS_PRIORITY[existing.status] ?? 0)) {
          entryByCid.set(e.cid, e)
        }
      }

      for (const job of serverJobs) {
        const entry = entryByCid.get(job.cid)
        synced++

        if (entry) {
          if (entry.status === 'pinned') {
            await prisma.pinJob.update({
              where: { id: job.id },
              data: { status: 'PINNED', error: null, progressBlocks: entry.progressBlocks },
            })
            pinned++
            await cleanupOldCidsAfterPin(job)
          } else if (entry.status === 'failed') {
            await prisma.pinJob.update({
              where: { id: job.id },
              data: { status: 'FAILED', error: entry.error || null, progressBlocks: entry.progressBlocks },
            })
            errors++
          } else if (entry.status === 'pinning') {
            // Активно пинится — обновляем прогресс, статус PINNING
            await prisma.pinJob.update({
              where: { id: job.id },
              data: { status: 'PINNING', progressBlocks: entry.progressBlocks },
            })
          } else {
            // queued — ждёт в очереди пинера, возвращаем в QUEUED
            await prisma.pinJob.update({
              where: { id: job.id },
              data: { status: 'QUEUED', progressBlocks: 0 },
            })
          }
        } else {
          // CID не найден в pin-queue — проверяем через pin/ls
          const lsResult = await kuboPinLs(server.apiUrl, job.cid, server.authSecret)
          if (lsResult.pinned) {
            await prisma.pinJob.update({
              where: { id: job.id },
              data: { status: 'PINNED', error: null },
            })
            pinned++
            await cleanupOldCidsAfterPin(job)
          } else {
            // Не в очереди и не запинен — auto-retry если задание застряло
            const jobAge = now - new Date(job.createdAt).getTime()
            if (jobAge > STALE_THRESHOLD_MS && job.progressBlocks === 0) {
              const retryResult = await pinQueueAdd(server.pinQueueUrl, job.cid, job.id, server.pinQueueSecret)
              if (retryResult.success) {
                retried++
                console.warn(`[pinning] Auto-retry: ${job.cid} на ${server.name}`)
              } else {
                await prisma.pinJob.update({
                  where: { id: job.id },
                  data: { status: 'FAILED', error: `Auto-retry failed: ${retryResult.error}` },
                })
                errors++
              }
            }
          }
        }
      }
    } else {
      // Kubo напрямую: pin/ls параллельно для всех CID сервера
      const lsResults = await Promise.all(serverJobs.map((job) => kuboPinLs(server.apiUrl, job.cid, server.authSecret)))

      for (let i = 0; i < serverJobs.length; i++) {
        const job = serverJobs[i]
        const result = lsResults[i]
        synced++

        if (result.pinned) {
          await prisma.pinJob.update({
            where: { id: job.id },
            data: { status: 'PINNED', error: null },
          })
          pinned++
          await cleanupOldCidsAfterPin(job)
        } else if (result.error) {
          // Ошибка при проверке — если задание застряло, retry pin/add
          const jobAge = now - new Date(job.createdAt).getTime()
          if (jobAge > STALE_THRESHOLD_MS && job.progressBlocks === 0) {
            const retryResult = await kuboPinAddAsync(server.apiUrl, job.cid, server.authSecret)
            if (retryResult.success) {
              retried++
              console.warn(`[pinning] Auto-retry (kubo): ${job.cid} на ${server.name}`)
            } else {
              await prisma.pinJob.update({
                where: { id: job.id },
                data: { status: 'FAILED', error: `Auto-retry failed: ${retryResult.error}` },
              })
              errors++
            }
          } else {
            errors++
          }
        } else if (!result.pinned && !result.error) {
          // Не запинен, нет ошибки — задание потерялось, retry если застряло
          const jobAge = now - new Date(job.createdAt).getTime()
          if (jobAge > STALE_THRESHOLD_MS && job.progressBlocks === 0) {
            const retryResult = await kuboPinAddAsync(server.apiUrl, job.cid, server.authSecret)
            if (retryResult.success) {
              retried++
              console.warn(`[pinning] Auto-retry (lost): ${job.cid} на ${server.name}`)
            } else {
              await prisma.pinJob.update({
                where: { id: job.id },
                data: { status: 'FAILED', error: `Auto-retry failed: ${retryResult.error}` },
              })
              errors++
            }
          }
        }
      }
    }
  }

  return { synced, pinned, errors, retried }
}

/**
 * Автоочистка старого CID после успешного пиннинга нового.
 * Вызывается при переходе PinJob в статус PINNED.
 * Находит CidHistory где newCid === запиненный CID и распинивает oldCid с того же сервера.
 */
async function cleanupOldCidsAfterPin(job: { cid: string; animeId: string | null; serverId: string }) {
  if (!job.animeId) {
    return
  }

  const pendingCleanup = await prisma.cidHistory.findMany({
    where: { animeId: job.animeId, newCid: job.cid, cleanedUp: false },
  })

  for (const entry of pendingCleanup) {
    try {
      // Находим PinJob для старого CID на том же сервере
      const oldPinJob = await prisma.pinJob.findUnique({
        where: { cid_serverId: { cid: entry.oldCid, serverId: job.serverId } },
        include: { server: true },
      })

      if (oldPinJob && oldPinJob.status === 'PINNED') {
        await unpinJob(oldPinJob.id)
        console.warn(`[pinning] Автоочистка: распинен старый CID ${entry.oldCid} (заменён на ${entry.newCid})`)
      }

      await prisma.cidHistory.update({
        where: { id: entry.id },
        data: { cleanedUp: true, cleanedUpAt: new Date() },
      })
    } catch (err) {
      console.error(`[pinning] Ошибка автоочистки CID ${entry.oldCid}:`, err)
    }
  }
}

// ============================================================================
// Throttled sync (автоматический sync не чаще раза в 30 секунд)
// ============================================================================

let lastSyncAt = 0
const SYNC_INTERVAL = 30_000 // 30 секунд

/**
 * Синхронизировать статусы с throttle — не чаще раза в 30 секунд.
 * Используется при polling active jobs для автоматического обновления статусов.
 */
export async function syncPinJobStatusesThrottled(): Promise<Awaited<ReturnType<typeof syncPinJobStatuses>> | null> {
  const now = Date.now()
  if (now - lastSyncAt < SYNC_INTERVAL) {
    return null
  }
  lastSyncAt = now
  return syncPinJobStatuses()
}

/**
 * Отменить QUEUED и PINNING задания для устаревшего CID.
 * Вызывается когда directoryCid аниме обновляется на новый.
 * PINNING задания тоже отменяем — бесполезно пинить устаревший контент.
 */
export async function cancelQueuedPinsForCid(cid: string): Promise<{ cancelled: number }> {
  const staleJobs = await prisma.pinJob.findMany({
    where: { cid, status: { in: ['QUEUED', 'PINNING'] } },
    include: { server: true },
  })

  let cancelled = 0
  for (const job of staleJobs) {
    try {
      // Удаляем из pin-queue (если есть)
      if (job.server.pinQueueUrl) {
        await pinQueueRemove(job.server.pinQueueUrl, job.cid, job.server.pinQueueSecret).catch(() => {
          // Ошибка удаления из pin-queue не критична
        })
      }
      await prisma.pinJob.update({
        where: { id: job.id },
        data: { status: 'UNPINNED', error: 'Отменено: CID заменён на новый' },
      })
      cancelled++
    } catch (err) {
      console.error(`Ошибка отмены пина ${job.id}:`, err)
    }
  }

  return { cancelled }
}

/** Распинить задание — удалить CID с сервера и обновить статус */
export async function unpinJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  const job = await prisma.pinJob.findUnique({
    where: { id: jobId },
    include: { server: true },
  })

  if (!job) {
    return { success: false, error: 'Задание не найдено' }
  }

  if (job.status === 'UNPINNED') {
    return { success: true }
  }

  // Выбираем способ: pin-queue или Kubo
  const result = job.server.pinQueueUrl
    ? await pinQueueRemove(job.server.pinQueueUrl, job.cid, job.server.pinQueueSecret)
    : await kuboPinRm(job.server.apiUrl, job.cid, job.server.authSecret)

  if (result.success) {
    await prisma.pinJob.update({
      where: { id: job.id },
      data: { status: 'UNPINNED', error: null },
    })
  } else {
    await prisma.pinJob.update({
      where: { id: job.id },
      data: { error: result.error || null },
    })
  }

  return result
}

/**
 * Запинить аниме на сервере.
 *
 * Если есть directoryCid — один рекурсивный pin покрывает весь контент
 * (видео, аудио, субтитры, шрифты, thumbnails, манифесты).
 * Если нет — fallback на старую логику (manifestCid + videoCid каждого эпизода).
 *
 * Fire-and-forget: создаёт задания и отправляет в Kubo, не ждёт завершения.
 * Клиент сразу получает ответ, статусы обновляются через syncPinJobStatuses.
 */
export async function pinAnime(
  animeId: string,
  serverId: string,
  createdById: string,
): Promise<{ results: Array<{ cid: string; success: boolean; error?: string }> }> {
  const anime = await prisma.anime.findUnique({
    where: { id: animeId },
    select: { directoryCid: true },
  })

  if (!anime) {
    return { results: [{ cid: '', success: false, error: 'Аниме не найдено' }] }
  }

  if (!anime.directoryCid) {
    return { results: [{ cid: '', success: false, error: 'Аниме не имеет directoryCid' }] }
  }

  const result = await createPinJob(anime.directoryCid, serverId, createdById, animeId)
  return { results: [{ cid: anime.directoryCid, success: result.success, error: result.error }] }
}

/** Распинить все CID аниме с конкретного сервера */
export async function unpinAnime(
  animeId: string,
  serverId: string,
): Promise<{ results: Array<{ cid: string; success: boolean; error?: string }> }> {
  const jobs = await prisma.pinJob.findMany({
    where: {
      animeId,
      serverId,
      status: { in: ['PINNED', 'PINNING', 'QUEUED'] },
    },
  })

  const results: Array<{ cid: string; success: boolean; error?: string }> = []

  for (const job of jobs) {
    const result = await unpinJob(job.id)
    results.push({ cid: job.cid, ...result })
  }

  return { results }
}

/** Запустить garbage collection на Kubo. На HDD может занять 10-30 мин. */
export async function kuboRepoGc(
  kuboApiUrl: string,
  authSecret?: string | null,
  timeout = 300_000,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${kuboApiUrl}/api/v0/repo/gc`, {
      method: 'POST',
      headers: kuboHeaders(authSecret),
      signal: AbortSignal.timeout(timeout),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    // Consume NDJSON stream полностью (иначе Kubo может застрять)
    await response.text()
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
  }
}

/** Получить размер репозитория Kubo через /api/v0/repo/stat */
export async function kuboRepoStat(
  kuboApiUrl: string,
  authSecret?: string | null,
  timeout = 10000,
): Promise<{ repoSize?: number; error?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${kuboApiUrl}/api/v0/repo/stat?size-only=true`, {
      method: 'POST',
      headers: kuboHeaders(authSecret),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    return { repoSize: data.RepoSize }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
  }
}

/** Лёгкая проверка доступности Kubo ноды через /api/v0/id */
export async function kuboHealthCheck(
  kuboApiUrl: string,
  authSecret?: string | null,
  timeout = 15000,
): Promise<{ online: boolean; peerId?: string; error?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${kuboApiUrl}/api/v0/id`, {
      method: 'POST',
      headers: kuboHeaders(authSecret),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      return { online: false, error: `HTTP ${response.status}: ${text}` }
    }

    const data = await response.json()
    return { online: true, peerId: data.ID }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { online: false, error: 'Таймаут запроса' }
    }
    return { online: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
  }
}

/**
 * Автоматически запинить аниме на наименее загруженных онлайн-серверах.
 *
 * @param replicaCount — количество серверов для репликации (по умолчанию все ONLINE серверы)
 */
export async function autoPinAnime(
  animeId: string,
  createdById: string,
): Promise<
  | { servers: Array<{ serverId: string; results: Array<{ cid: string; success: boolean; error?: string }> }> }
  | {
    error: string
  }
> {
  // Шардирование: каждое аниме пинится на ОДНОМ сервере
  const anime = await prisma.anime.findUnique({
    where: { id: animeId },
    select: { pinnedOnId: true },
  })

  if (!anime) {
    return { error: 'Аниме не найдено' }
  }

  let targetServerId = anime.pinnedOnId

  if (targetServerId) {
    // Аниме уже привязано к серверу — проверяем что он ONLINE, PINNER и не переполнен
    const server = await prisma.pinServer.findUnique({ where: { id: targetServerId } })
    if (!server || server.status !== 'ONLINE') {
      return { error: `Пин-сервер ${server?.name ?? targetServerId} не в статусе ONLINE` }
    }
    if (server.role !== 'PINNER') {
      return { error: `${server.name} не является пин-сервером (role: ${server.role})` }
    }
  } else {
    // Новое аниме — выбираем наименее загруженный ONLINE PINNER с доступным местом
    const candidates = await prisma.pinServer.findMany({
      where: { status: 'ONLINE', role: 'PINNER' },
      orderBy: { usedBytes: 'asc' },
    })

    // Исключаем серверы где capacityBytes задан и usedBytes >= capacityBytes
    const server = candidates.find(
      (s) => s.capacityBytes === 0n || s.usedBytes < s.capacityBytes,
    )

    if (!server) {
      return { error: 'Нет доступных пин-серверов (все заполнены или недоступны)' }
    }

    targetServerId = server.id

    // Привязываем аниме к серверу
    await prisma.anime.update({
      where: { id: animeId },
      data: { pinnedOnId: targetServerId },
    })
  }

  const { results } = await pinAnime(animeId, targetServerId, createdById)
  return { servers: [{ serverId: targetServerId, results }] }
}

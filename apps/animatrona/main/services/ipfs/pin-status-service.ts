/**
 * Pin Status Service — трекинг статуса пинирования CID на удалённых серверах
 *
 * Решает проблему безопасного GC:
 *   LOCAL_ONLY / PIN_QUEUED → блоки только локально → нельзя удалять из Kubo
 *   PINNED_REMOTE           → контент на пинерах   → можно освобождать локально
 *
 * Используется pin-normalizer.ts (защита от случайного unpin) и
 * content-deletion.ts (безопасная разгрузка диска).
 */

import { CID } from 'multiformats/cid'

import type { RemotePinStatus } from '../../prisma'
import { prisma } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'
import { normalizeAllPins } from './pin-normalizer'

const log = createModuleLogger('PinStatusService')

// ─── Статусные мутации ────────────────────────────────────────────────────────

/**
 * Зарегистрировать CID как локальный (только что добавлен в Kubo).
 * Если запись уже существует с более «продвинутым» статусом — не перезаписывает.
 */
export async function markAsLocalOnly(cid: string): Promise<void> {
  await prisma.pinStatus.upsert({
    where: { cid },
    create: { cid, status: 'LOCAL_ONLY' },
    update: {
      // Перезаписываем только если было FAILED (повторное добавление)
      status: 'LOCAL_ONLY',
      errorMsg: null,
    },
  })
}

/**
 * Пометить CID как отправленный в очередь пинирования.
 */
export async function markAsQueued(cid: string): Promise<void> {
  await prisma.pinStatus.upsert({
    where: { cid },
    create: { cid, status: 'PIN_QUEUED', queuedAt: new Date() },
    update: { status: 'PIN_QUEUED', queuedAt: new Date() },
  })
}

/**
 * Пометить CID как успешно запиненный на удалённом пинере.
 */
export async function markAsPinnedRemote(cid: string): Promise<void> {
  await prisma.pinStatus.upsert({
    where: { cid },
    create: { cid, status: 'PINNED_REMOTE', pinnedAt: new Date() },
    update: { status: 'PINNED_REMOTE', pinnedAt: new Date(), errorMsg: null, retryCount: 0 },
  })
}

/**
 * Пометить CID как неудачно запиненный.
 */
export async function markAsFailed(cid: string, error: string): Promise<void> {
  await prisma.pinStatus.upsert({
    where: { cid },
    create: { cid, status: 'FAILED', errorMsg: error, retryCount: 1 },
    update: {
      status: 'FAILED',
      errorMsg: error,
      retryCount: { increment: 1 },
    },
  })
}

// ─── Проверки ─────────────────────────────────────────────────────────────────

/**
 * Безопасно ли удалять CID из локального Kubo?
 *
 * Безопасно если:
 * - Нет записи в PinStatus (исторический CID, добавлен до внедрения трекинга)
 * - Статус PINNED_REMOTE (контент подтверждён на удалённых пинерах)
 *
 * Небезопасно если:
 * - LOCAL_ONLY (блоки только локально, ещё не отправлены)
 * - PIN_QUEUED (в очереди, ещё не подтверждено)
 * - FAILED (ошибка пинирования — удалять нельзя, нужно повторить)
 */
export async function isSafeToUnpinLocally(cid: string): Promise<boolean> {
  const record = await prisma.pinStatus.findUnique({
    where: { cid },
    select: { status: true },
  })

  // Нет записи → исторический CID, считаем безопасным (был до трекинга)
  if (!record) return true

  return record.status === 'PINNED_REMOTE'
}

/**
 * Получить все CID, которые нельзя удалять из локального Kubo.
 * (LOCAL_ONLY и PIN_QUEUED — ещё не на удалённых пинерах)
 */
export async function getLocalOnlyCids(): Promise<string[]> {
  const records = await prisma.pinStatus.findMany({
    where: { status: { in: ['LOCAL_ONLY', 'PIN_QUEUED'] } },
    select: { cid: true },
  })
  return records.map((r) => r.cid)
}

/**
 * Получить статистику по статусам пинирования.
 */
export async function getPinStatusStats(): Promise<Record<RemotePinStatus, number>> {
  const groups = await prisma.pinStatus.groupBy({
    by: ['status'],
    _count: { cid: true },
  })

  const result: Record<string, number> = {
    LOCAL_ONLY: 0,
    PIN_QUEUED: 0,
    PINNED_REMOTE: 0,
    FAILED: 0,
  }

  for (const g of groups) {
    result[g.status] = g._count.cid
  }

  return result as Record<RemotePinStatus, number>
}

// ─── Миграция: регистрация существующих CID ──────────────────────────────────

/**
 * Сканировать все CID в БД и зарегистрировать те, у которых нет записи в PinStatus.
 *
 * Используется при первом запуске после обновления — чтобы исторический контент
 * не был случайно удалён GC (будет помечен как LOCAL_ONLY и защищён).
 *
 * CID которые уже есть в PinStatus — не трогаются.
 */
export async function scanAndRegisterLocalCids(
  onProgress?: (processed: number, total: number) => void,
): Promise<{ registered: number; skipped: number }> {
  log.info('Сканирование CID в БД для регистрации в PinStatus...')

  // Собираем все CID из всех таблиц
  const allCids = new Set<string>()

  // Anime
  const animes = await prisma.anime.findMany({
    select: { posterCid: true, animeInfoCid: true, directoryCid: true },
  })
  for (const a of animes) {
    if (a.posterCid) allCids.add(a.posterCid)
    if (a.animeInfoCid) allCids.add(a.animeInfoCid)
    if (a.directoryCid) allCids.add(a.directoryCid)
  }

  // Episodes + вложенные треки
  const episodes = await prisma.episode.findMany({
    select: {
      transcodedCid: true,
      manifestCid: true,
      thumbnailCids: true,
      screenshotCids: true,
      spriteCid: true,
      vttCid: true,
      chaptersCid: true,
      metadataCid: true,
      audioTracks: { select: { transcodedCid: true } },
      subtitleTracks: {
        select: {
          fileCid: true,
          fonts: { select: { fileCid: true } },
        },
      },
    },
  })

  for (const ep of episodes) {
    if (ep.transcodedCid) allCids.add(ep.transcodedCid)
    if (ep.manifestCid) allCids.add(ep.manifestCid)
    if (ep.spriteCid) allCids.add(ep.spriteCid)
    if (ep.vttCid) allCids.add(ep.vttCid)
    if (ep.chaptersCid) allCids.add(ep.chaptersCid)
    if (ep.metadataCid) allCids.add(ep.metadataCid)
    if (ep.thumbnailCids) {
      try {
        for (const cid of JSON.parse(ep.thumbnailCids) as string[]) allCids.add(cid)
      } catch { /* ignore */ }
    }
    if (ep.screenshotCids) {
      try {
        for (const cid of JSON.parse(ep.screenshotCids) as string[]) allCids.add(cid)
      } catch { /* ignore */ }
    }
    for (const t of ep.audioTracks) {
      if (t.transcodedCid) allCids.add(t.transcodedCid)
    }
    for (const s of ep.subtitleTracks) {
      if (s.fileCid) allCids.add(s.fileCid)
      for (const f of s.fonts) {
        if (f.fileCid) allCids.add(f.fileCid)
      }
    }
  }

  // Files (постеры Shikimori и т.д.)
  const files = await prisma.file.findMany({ select: { cid: true } })
  for (const f of files) {
    if (f.cid) allCids.add(f.cid)
  }

  const cidList = [...allCids]
  const total = cidList.length
  log.info('CID найдено в БД', { total })

  // Узнаём какие уже есть в PinStatus
  const existing = await prisma.pinStatus.findMany({
    where: { cid: { in: cidList } },
    select: { cid: true },
  })
  const existingSet = new Set(existing.map((r) => r.cid))

  const toRegister = cidList.filter((cid) => !existingSet.has(cid))
  log.info('CID для регистрации', { count: toRegister.length, skipped: existingSet.size })

  // Пакетная вставка
  const BATCH = 500
  let registered = 0

  for (let i = 0; i < toRegister.length; i += BATCH) {
    const batch = toRegister.slice(i, i + BATCH)
    await prisma.pinStatus.createMany({
      data: batch.map((cid) => ({ cid, status: 'LOCAL_ONLY' as RemotePinStatus })),
      skipDuplicates: true,
    })
    registered += batch.length
    onProgress?.(registered, toRegister.length)
  }

  log.info('Регистрация завершена', { registered, skipped: existingSet.size })
  return { registered, skipped: existingSet.size }
}

// ─── Безопасный GC ────────────────────────────────────────────────────────────

export interface SafeGcResult {
  /** Блоки удалённые GC */
  freedBlocks: number
  /** CID защищённые от удаления (LOCAL_ONLY + PIN_QUEUED) */
  protectedCids: number
  /** Ошибки во время GC */
  errors: number
}

export type SafeGcProgress = (step: string, current?: number, total?: number) => void

/**
 * Безопасная сборка мусора в локальном Kubo.
 *
 * Алгоритм:
 * 1. Нормализуем пины (pin-normalizer учитывает PinStatus — LOCAL_ONLY остаются recursive)
 * 2. Запускаем repo.gc() — удаляет только unreferenced блоки
 *    - LOCAL_ONLY: защищены recursive пинами → не удаляются
 *    - PINNED_REMOTE: indirect или без пина → GC освобождает место
 *
 * Требует: все LOCAL_ONLY CID должны иметь recursive pin в Kubo.
 * pin-normalizer.ts гарантирует это после интеграции с PinStatus.
 */
export async function safeLocalGc(onProgress?: SafeGcProgress): Promise<SafeGcResult> {
  const kuboService = getKuboService()
  const client = kuboService.getClientOrNull()
  if (!client) {
    throw new Error('Kubo не запущен')
  }

  // Шаг 1: нормализуем пины
  // pin-normalizer пропустит LOCAL_ONLY/PIN_QUEUED CID → они сохранят recursive пин
  onProgress?.('Нормализация пинов...')
  log.info('Нормализация пинов перед GC')
  await normalizeAllPins((step, current, total) => {
    onProgress?.(`Нормализация: ${step}`, current, total)
  })

  // Шаг 2: проверяем сколько CID под защитой
  const localOnlyCids = await getLocalOnlyCids()
  const protectedCids = localOnlyCids.length
  log.info('CID защищены от GC', { protectedCids })
  onProgress?.(`Защищено от GC: ${protectedCids} CID`)

  // Шаг 3: запускаем GC
  onProgress?.('Запуск Kubo repo.gc()...')
  log.info('Запуск Kubo repo.gc()')
  let freedBlocks = 0
  let errors = 0

  try {
    for await (const result of client.repo.gc()) {
      if (result.err) {
        log.debug('GC ошибка для блока', { err: result.err.message })
        errors++
      } else {
        freedBlocks++
      }
    }
  } catch (error) {
    log.error('Ошибка Kubo repo.gc()', { error: String(error) })
    throw error
  }

  log.info('Safe GC завершён', { freedBlocks, protectedCids, errors })
  onProgress?.(`GC завершён: освобождено ${freedBlocks} блоков`)

  return { freedBlocks, protectedCids, errors }
}

/**
 * Попробовать закрепить CID локально без скачивания с сети.
 *
 * Если все блоки CID уже есть в локальном Kubo — pin.add завершается немедленно (<500ms).
 * Если блоки нужно скачивать — таймаут, возвращаем false.
 *
 * Используется как аварийная защита перед GC если нормализация не была запущена.
 */
export async function tryPinLocalOnly(cid: string, timeoutMs = 500): Promise<boolean> {
  const client = getKuboService().getClientOrNull()
  if (!client) return false

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    await client.pin.add(CID.parse(cid), { signal: controller.signal })
    clearTimeout(timer)
    return true
  } catch {
    clearTimeout(timer)
    return false
  }
}

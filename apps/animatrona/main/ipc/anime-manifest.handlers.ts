/**
 * IPC handlers для AnimeManifest и AnimeInfo
 *
 * Обеспечивает генерацию и получение манифестов и AnimeInfo из IPFS.
 */

import { statfs } from 'node:fs/promises'
import path from 'node:path'

import type { AnimeInfo } from '../../shared/types/anime-info'
import type { AnimeManifest, GenerateAnimeManifestInput } from '../../shared/types/anime-manifest'
import {
  generateAnimeInfo,
  generateAnimeManifest,
  getAnimeInfoFromIpfs,
  getAnimeManifestFromIpfs,
  importAnimeFromManifest,
  updateAnimeManifest,
} from '../services/anime-manifest-generator'
import { getDatabasePath } from '../services/database'
import { regenerateAnimeEpisodeManifests } from '../services/episode-manifest-regen'
import { backfillIpfsSizes } from '../services/ipfs/backfill-ipfs-sizes'
import { regenCheckpointStore } from '../services/regen-checkpoint'
import { regenerationState, type RegenLogEntry } from '../services/regeneration-state'
import { prisma } from '../utils/db'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('AnimeManifestHandlers')

/** Флаг остановки регенерации — устанавливается из renderer через stopRegeneration handler */
let stopRegenRequested = false

/**
 * Проверяет, является ли ошибка ошибкой нехватки места на диске.
 *
 * Детектирует ENOSPC (Linux/macOS), аналоги Windows и сообщения Kubo о нехватке места.
 */
function isDiskFullError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const code = (error as NodeJS.ErrnoException).code
  if (code === 'ENOSPC') return true
  const msg = error.message.toLowerCase()
  return (
    msg.includes('no space left')
    || msg.includes('not enough space')
    || msg.includes('disk full')
    || msg.includes('enospc')
    || msg.includes('insufficient storage')
    || msg.includes('datastore is full')
    || msg.includes('not enough free disk')
  )
}

/** Порог свободного места на диске для остановки регенерации (30 ГБ) */
const FREE_SPACE_THRESHOLD_BYTES = 30 * 1024 * 1024 * 1024

/**
 * Возвращает количество байт, доступных для записи на диске, где хранится userData.
 *
 * Использует fs.statfs (Node 19+). При ошибке возвращает Infinity —
 * чтобы не блокировать регенерацию на системах без поддержки.
 */
async function getFreeDiskBytes(): Promise<number> {
  try {
    const dir = path.dirname(getDatabasePath())
    const stats = await statfs(dir)
    // bavail — доступно непривилегированному процессу (не учитывает reserved blocks)
    return stats.bavail * stats.bsize
  } catch {
    return Infinity
  }
}

/**
 * Регистрирует IPC handlers для работы с AnimeManifest
 */
export function registerAnimeManifestHandlers(): void {
  /**
   * Генерировать манифест аниме и опубликовать в IPFS
   *
   * Собирает все метаданные из БД, создаёт AnimeManifest JSON,
   * публикует в IPFS и возвращает CID.
   */
  createHandler('animeManifest:generate', async (input: GenerateAnimeManifestInput) => {
    log.info('Генерация AnimeManifest', { animeId: input.animeId })
    return generateAnimeManifest(input)
  })

  /**
   * Регенерировать манифест аниме и пересобрать IPFS-директорию
   */
  createHandler('animeManifest:update', async (animeId: string) => {
    log.info('Обновление AnimeManifest', { animeId })
    return updateAnimeManifest(animeId)
  })

  /**
   * Получить манифест из IPFS по directory CID
   */
  createHandler('animeManifest:get', async (inputCid: string): Promise<AnimeManifest> => {
    log.info('Получение AnimeManifest', { inputCid })

    const manifest = await getAnimeManifestFromIpfs(`${inputCid}/manifest.json`)
    if (!manifest) {
      throw new Error(`Манифест не найден: ${inputCid}`)
    }
    return manifest
  })

  /**
   * Получить манифест аниме по ID аниме
   *
   * Если directoryCid есть в БД — загружает manifest.json из директории.
   * Если нет — генерирует новый.
   */
  createHandler('animeManifest:getByAnimeId', async (animeId: string): Promise<AnimeManifest> => {
    log.info('Получение AnimeManifest по animeId', { animeId })

    const anime = await prisma.anime.findUnique({
      where: { id: animeId },
      select: { directoryCid: true, name: true },
    })

    if (!anime) {
      throw new Error(`Аниме не найдено: ${animeId}`)
    }

    if (anime.directoryCid) {
      const manifest = await getAnimeManifestFromIpfs(`${anime.directoryCid}/manifest.json`)
      if (manifest) {
        return manifest
      }
      log.warn('Манифест не найден в IPFS, генерируем новый', { directoryCid: anime.directoryCid })
    }

    // Генерируем новый манифест
    const result = await updateAnimeManifest(animeId)
    if (!result.success || !result.manifest) {
      throw new Error(result.error || 'Не удалось сгенерировать манифест')
    }

    return result.manifest
  })

  /**
   * Batch-генерация манифестов для нескольких аниме
   *
   * Используется при миграции существующей библиотеки.
   */
  createHandler(
    'animeManifest:generateBatch',
    async (
      animeIds: string[],
      onProgress?: (current: number, total: number, animeName: string) => void,
    ): Promise<{ success: number; failed: number; errors: Array<{ animeId: string; error: string }> }> => {
      log.info('Batch-генерация AnimeManifest', { count: animeIds.length })

      const result = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ animeId: string; error: string }>,
      }

      for (let i = 0; i < animeIds.length; i++) {
        const animeId = animeIds[i]

        try {
          // Получаем имя для прогресса
          const anime = await prisma.anime.findUnique({
            where: { id: animeId },
            select: { name: true },
          })

          onProgress?.(i + 1, animeIds.length, anime?.name || animeId)

          const generateResult = await updateAnimeManifest(animeId)
          if (generateResult.success) {
            result.success++
          } else {
            result.failed++
            result.errors.push({ animeId, error: generateResult.error || 'Unknown error' })
          }
        } catch (error) {
          result.failed++
          result.errors.push({
            animeId,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      log.info('Batch-генерация завершена', { success: result.success, failed: result.failed })
      return result
    },
  )

  /**
   * Получить список аниме без directoryCid
   *
   * Возвращает ID аниме, которым нужно сгенерировать директорию.
   */
  createHandler('animeManifest:getAnimesWithoutManifest', async (): Promise<Array<{ id: string; name: string }>> => {
    const animes = await prisma.anime.findMany({
      where: { directoryCid: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return animes
  })

  /**
   * Импортировать аниме из IPFS манифеста
   *
   * Создаёт минимальные записи в БД для списка библиотеки.
   * Эпизоды создаются без локальных файлов — для стриминга из IPFS.
   */
  createHandler(
    'animeManifest:import',
    async (
      cid: string,
      pin?: boolean,
    ): Promise<{ success: boolean; animeId?: string; animeName?: string; episodeCount?: number; error?: string }> => {
      log.info('Импорт аниме из IPFS', { cid, pin })
      return importAnimeFromManifest(cid, { pin })
    },
  )

  /**
   * Получить список аниме без animeInfoCid
   *
   * Возвращает аниме, которым нужно сгенерировать AnimeInfo.
   */
  createHandler('animeManifest:getAnimesWithoutAnimeInfo', async (): Promise<Array<{ id: string; name: string }>> => {
    const animes = await prisma.anime.findMany({
      where: { animeInfoCid: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return animes
  })

  /**
   * Регенерировать все манифесты (batch-обновление)
   *
   * Обновляет EpisodeManifest (дорожки из БД) + AnimeManifest + directoryCid для каждого аниме.
   * Исправляет дубликаты дорожек, синхронизирует метаданные.
   */
  createHandler(
    'animeManifest:regenerateAll',
    async (
      opts?: { resumeFrom?: string },
    ): Promise<{ success: number; failed: number; errors: Array<{ animeId: string; error: string }> }> => {
      stopRegenRequested = false
      const resumeFrom = opts?.resumeFrom ? new Date(opts.resumeFrom) : null
      log.info('Регенерация всех манифестов (Episode + Anime)', { resume: !!resumeFrom })

      const allAnimes = await prisma.anime.findMany({
        where: resumeFrom
          ? { OR: [{ lastHealthCheckAt: null }, { lastHealthCheckAt: { lt: resumeFrom } }] }
          : undefined,
        select: { id: true, name: true, animeInfoCid: true, directoryCid: true },
        orderBy: { name: 'asc' },
      })

      // Сохраняем чекпоинт — время старта и общее количество аниме
      const startedAt = opts?.resumeFrom ?? new Date().toISOString()
      const prevCheckpoint = await regenCheckpointStore.load()
      await regenCheckpointStore.save({
        startedAt,
        // При возобновлении сохраняем оригинальный total, иначе — текущий count
        total: resumeFrom && prevCheckpoint.total > 0 ? prevCheckpoint.total : allAnimes.length,
      })

      const result = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ animeId: string; error: string }>,
      }

      // Стартуем persist-state: renderer может уйти со страницы и вернуться,
      // мы сохраним прогресс и весь лог в main, отдадим обратно.
      regenerationState.start(allAnimes.length)
      // appendLog сам делает broadcast в renderer когда state активный.
      const logEntry = (level: RegenLogEntry['level'], message: string, meta?: Record<string, unknown>) => {
        regenerationState.appendLog(level, message, meta)
      }
      logEntry('info', `Начата регенерация ${allAnimes.length} аниме`)

      // Утилита для запуска Kubo GC — освобождает место от распиненных блоков.
      // Вызываем в начале и каждые 10 аниме, чтобы не заканчивалось место на диске.
      const runKuboGc = async () => {
        try {
          const { getKuboService } = await import('../services/kubo')
          const client = getKuboService().getClientOrNull()
          if (client) {
            let freed = 0
            for await (const _ of client.repo.gc()) {
              freed++
            }
            if (freed > 0) {
              logEntry('info', `   ♻ GC: освобождено ${freed} блоков`)
            }
          }
        } catch (e) {
          log.warn('Kubo GC не удался', { error: String(e) })
        }
      }

      // GC перед стартом — очищаем мусор от предыдущих запусков
      await runKuboGc()

      for (let i = 0; i < allAnimes.length; i++) {
        // Проверяем флаг остановки — пользователь нажал «Остановить»
        if (stopRegenRequested) {
          log.info('Регенерация остановлена пользователем', { processed: i, remaining: allAnimes.length - i })
          logEntry('warn', `⏹ Остановлено пользователем. Обработано: ${i} из ${allAnimes.length}. Чекпоинт сохранён.`)
          regenerationState.finish(result)
          broadcastToWindows('manifest:regenerateFinished', {
            success: result.success,
            failed: result.failed,
            stopped: true,
          })
          return result
        }

        // Проверяем свободное место на диске — останавливаем за 30 ГБ до конца
        const freeBytes = await getFreeDiskBytes()
        if (freeBytes < FREE_SPACE_THRESHOLD_BYTES) {
          const freeGb = (freeBytes / 1024 / 1024 / 1024).toFixed(1)
          log.error('Мало места на диске — регенерация остановлена превентивно', {
            freeGb,
            thresholdGb: 30,
            processed: i,
          })
          logEntry(
            'error',
            `🚫 Мало места на диске (${freeGb} ГБ < 30 ГБ) — регенерация остановлена. Обработано: ${i} из ${allAnimes.length}. Освободите место и возобновите с чекпоинта.`,
          )
          regenerationState.finish(result)
          broadcastToWindows('manifest:regenerateFinished', {
            success: result.success,
            failed: result.failed,
            stopped: true,
            diskFull: true,
          })
          return result
        }

        const anime = allAnimes[i]

        try {
          regenerationState.updateProgress(i + 1, allAnimes.length, anime.name)
          broadcastToWindows('manifest:regenerateProgress', {
            current: i + 1,
            total: allAnimes.length,
            animeName: anime.name,
            status: 'processing' as const,
          })
          logEntry('info', `[${i + 1}/${allAnimes.length}] ${anime.name}`, { animeId: anime.id })

          // Backfill ipfsSize для существующих файлов ПЕРЕД генерацией манифеста
          await backfillIpfsSizes(anime.id)

          // 1. Перестроить EpisodeManifest (без сборки директории — делаем её ниже после Shikimori refresh)
          const epResult = await regenerateAnimeEpisodeManifests(anime.id, { skipDirectoryBuild: true })
          if (epResult.failed > 0) {
            log.warn('Часть EpisodeManifest не обновилась', {
              animeName: anime.name,
              updated: epResult.updated,
              failed: epResult.failed,
            })
          }

          // 2. Shikimori refresh + обновить AnimeManifest если данные изменились
          logEntry('info', `   ↻ Shikimori: проверяю обновления…`)
          const updateResult = await updateAnimeManifest(anime.id)
          if (updateResult.directoryError) {
            log.warn('Манифест обновлён, но директория не построена', {
              animeName: anime.name,
              error: updateResult.directoryError,
            })
          }

          if (updateResult.success) {
            result.success++
            broadcastToWindows('manifest:regenerateProgress', {
              current: i + 1,
              total: allAnimes.length,
              animeName: anime.name,
              status: 'ok' as const,
            })
            const infoChanged = updateResult.manifest?.animeInfoCid !== anime.animeInfoCid
            const dirNote = updateResult.unchanged ? 'директория без изменений' : 'директория обновлена'
            const shikimoriNote = infoChanged ? ' · Shikimori ↑' : ''
            const contentHealth = updateResult.contentHealth ?? 'complete'
            const healthHint = contentHealth !== 'complete' ? ` · health=${contentHealth}` : ''
            logEntry('success', `   ✓ ${dirNote}${healthHint}${shikimoriNote}`, {
              animeId: anime.id,
              health: contentHealth,
              missingCidsCount: updateResult.missingCidsCount ?? 0,
              missingFontsCount: updateResult.missingFontsCount ?? 0,
              recoveredCount: updateResult.recoveredCount ?? 0,
            })
          } else {
            result.failed++
            result.errors.push({ animeId: anime.id, error: updateResult.error || 'Unknown error' })
            broadcastToWindows('manifest:regenerateProgress', {
              current: i + 1,
              total: allAnimes.length,
              animeName: anime.name,
              status: 'error' as const,
              error: updateResult.error,
            })
            logEntry('error', `   ✗ ${anime.name}: ${updateResult.error || 'Unknown error'}`, {
              animeId: anime.id,
            })
          }
        } catch (error) {
          result.failed++
          const errorMsg = error instanceof Error ? error.message : String(error)
          result.errors.push({ animeId: anime.id, error: errorMsg })
          broadcastToWindows('manifest:regenerateProgress', {
            current: i + 1,
            total: allAnimes.length,
            animeName: anime.name,
            status: 'error' as const,
            error: errorMsg,
          })
          logEntry('error', `   ✗ ${anime.name}: ${errorMsg}`, { animeId: anime.id })

          // Нет места на диске — останавливаем регенерацию немедленно.
          // Дальнейшие попытки только усугубят ситуацию и скорее всего тоже провалятся.
          if (isDiskFullError(error)) {
            log.error('Нет места на диске — регенерация остановлена', { processed: i + 1 })
            logEntry(
              'error',
              `🚫 Нет места на диске! Регенерация остановлена. Обработано: ${
                i + 1
              } из ${allAnimes.length}. Освободите место и возобновите с чекпоинта.`,
            )
            broadcastToWindows('manifest:regenerateProgress', {
              current: i + 1,
              total: allAnimes.length,
              animeName: anime.name,
              status: 'error' as const,
              error: 'Нет места на диске — регенерация остановлена',
            })
            regenerationState.finish(result)
            broadcastToWindows('manifest:regenerateFinished', {
              success: result.success,
              failed: result.failed,
              stopped: true,
              diskFull: true,
            })
            return result
          }
        }

        // Пауза для GC между аниме — предотвращает OOM при большой библиотеке.
        // global.gc() работает только если Electron запущен с --js-flags=--expose-gc.
        global.gc?.()
        await new Promise((r) => setTimeout(r, 200))

        // Каждые 10 аниме — GC + длинная пауза для освобождения места и HTTP connection pool Kubo
        if ((i + 1) % 10 === 0) {
          global.gc?.()
          logEntry('info', `♻ GC после ${i + 1} аниме…`)
          await runKuboGc()
          await new Promise((r) => setTimeout(r, 3000))
          global.gc?.()
        }
      }

      log.info('Регенерация завершена', { success: result.success, failed: result.failed })
      logEntry(
        result.failed > 0 ? 'warn' : 'success',
        `Готово: ${result.success} успешно${result.failed > 0 ? `, ${result.failed} ошибок` : ''}`,
      )
      regenerationState.finish(result)
      broadcastToWindows('manifest:regenerateFinished', {
        success: result.success,
        failed: result.failed,
      })

      // Очищаем чекпоинт — регенерация завершена успешно
      await regenCheckpointStore.save({ startedAt: null, total: 0 })

      return result
    },
  )

  /**
   * Остановить регенерацию.
   *
   * Устанавливает флаг, который проверяется в начале каждой итерации цикла.
   * Чекпоинт сохраняется — можно возобновить с того же места.
   */
  createHandler('animeManifest:stopRegeneration', () => {
    stopRegenRequested = true
    log.info('Запрос остановки регенерации')
    return true
  })

  /**
   * Получить чекпоинт прерванной регенерации.
   *
   * Возвращает null если нет активного чекпоинта (регенерация не запускалась
   * или завершилась успешно). Если чекпоинт есть — считает сколько аниме
   * ещё не обработано (pending).
   */
  createHandler('animeManifest:getRegenCheckpoint', async () => {
    const data = await regenCheckpointStore.load()
    if (!data.startedAt) return null

    const pending = await prisma.anime.count({
      where: {
        OR: [{ lastHealthCheckAt: null }, { lastHealthCheckAt: { lt: new Date(data.startedAt) } }],
      },
    })

    return { startedAt: data.startedAt, total: data.total, pending }
  })

  /**
   * Получить текущее состояние регенерации.
   *
   * Renderer вызывает при mount чтобы восстановить UI если регенерация в процессе
   * (пользователь ушёл с страницы и вернулся).
   */
  createHandler('animeManifest:getRegenerationStatus', () => {
    return regenerationState.getStatus()
  })

  /**
   * Сбросить state регенерации (после ack пользователем — закрыл итоговый блок).
   */
  createHandler('animeManifest:resetRegenerationState', () => {
    regenerationState.reset()
    return true
  })

  // === AnimeInfo handlers ===

  /**
   * Получить AnimeInfo из IPFS по CID
   *
   * Используется для загрузки каноничных неизменяемых метаданных аниме.
   */
  createHandler('animeInfo:get', async (animeInfoCid: string): Promise<AnimeInfo> => {
    log.info('Получение AnimeInfo', { animeInfoCid })
    const animeInfo = await getAnimeInfoFromIpfs(animeInfoCid)
    if (!animeInfo) {
      throw new Error(`AnimeInfo не найден: ${animeInfoCid}`)
    }
    return animeInfo
  })

  /**
   * Генерировать AnimeInfo для аниме
   *
   * Собирает неизменяемые метаданные из БД и Shikimori API,
   * публикует в IPFS и возвращает CID.
   */
  createHandler('animeInfo:generate', async (animeId: string) => {
    log.info('Генерация AnimeInfo', { animeId })
    return generateAnimeInfo(animeId)
  })

  /**
   * Дедупликация AudioTrack / SubtitleTrack в БД
   *
   * Находит и удаляет дубли дорожек (например, оставшиеся после импорта
   * до добавления dedup-логики). Используется кнопкой в Settings → P2P.
   * После дедупа пользователю следует запустить «Регенерировать манифесты».
   */
  createHandler('tracks:deduplicate', async () => {
    log.info('Запрос дедупликации дорожек')
    const { deduplicateTracks } = await import('../services/track-dedup')
    return deduplicateTracks()
  })

  /**
   * Сводка по contentHealth — счётчики complete/degraded/broken/unknown.
   *
   * Используется для отчёта в UI после регенерации манифестов.
   */
  createHandler(
    'animeManifest:getHealthSummary',
    async (): Promise<{ complete: number; degraded: number; broken: number; unknown: number }> => {
      const grouped = await prisma.anime.groupBy({
        by: ['contentHealth'],
        _count: { _all: true },
      })
      const summary = { complete: 0, degraded: 0, broken: 0, unknown: 0 }
      for (const row of grouped) {
        const key = row.contentHealth as 'complete' | 'degraded' | 'broken' | null
        if (key === 'complete') summary.complete = row._count._all
        else if (key === 'degraded') summary.degraded = row._count._all
        else if (key === 'broken') summary.broken = row._count._all
        else summary.unknown += row._count._all
      }
      return summary
    },
  )

  /**
   * Список аниме с потерями (degraded или broken) для UI-отчёта.
   */
  createHandler(
    'animeManifest:getDegradedAndBroken',
    async (): Promise<
      Array<{
        id: string
        name: string
        contentHealth: string | null
        missingCidsJson: string | null
        missingFontsJson: string | null
      }>
    > => {
      return prisma.anime.findMany({
        where: { contentHealth: { in: ['degraded', 'broken'] } },
        select: {
          id: true,
          name: true,
          contentHealth: true,
          missingCidsJson: true,
          missingFontsJson: true,
        },
        orderBy: [{ contentHealth: 'desc' }, { name: 'asc' }],
      })
    },
  )
}

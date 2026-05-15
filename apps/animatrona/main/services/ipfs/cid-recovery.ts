/**
 * CID Recovery — попытки восстановить потерянные CID при построении directoryCid.
 *
 * Используется в anime-directory-builder когда `probeCidAvailable` показал что
 * CID недостижим в сети. Каждая функция возвращает новый CID при успехе или null.
 *
 * Стратегии:
 * - Изображения студий/персонажей/etc. → re-fetch с Shikimori через `imageUrl`
 * - Постер аниме → re-fetch с Shikimori
 * - Sprite/VTT (seek-bar) → скачать video.webm из IPFS, перегенерировать через ffmpeg
 * - Thumbnails-img (320px) → downscale из живых screenshot CID или из video.webm
 * - Метаданные → minimal JSON из БД
 *
 * Шрифты НЕ восстанавливаем (только probe). Если мёртв — в missingFonts отчёт.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { generateScreenshots, generateThumbnailSprite } from '../../ffmpeg/screenshot'
import { createModuleLogger } from '../../utils/logger'
import { uploadToIpfs } from '../import/import-ipfs'
import { detectIntros, type IntroDetectorResult } from '../intro-detector'
import { downloadPoster } from '../shikimori/client'

import { addBytes, saveToFile } from './unified-ipfs-service'

const log = createModuleLogger('CidRecovery')

/**
 * Восстановить изображение через Shikimori URL.
 *
 * Если у нас есть оригинальный imageUrl от Shikimori — скачиваем его, загружаем в IPFS,
 * получаем новый CID. Это работает для studios/persons/characters/poster.
 *
 * @param opts.imageUrl - оригинальный URL изображения на Shikimori
 * @param opts.entityKey - стабильный ключ для имени файла (id или slug)
 * @returns новый CID или null если скачивание/upload не удались
 */
export async function recoverShikimoriImage(opts: { imageUrl: string; entityKey: string }): Promise<string | null> {
  try {
    const result = await downloadPoster(opts.imageUrl, opts.entityKey)
    if (!result?.localPath) {
      log.warn('downloadPoster вернул null', { imageUrl: opts.imageUrl })
      return null
    }
    const ipfsResult = await uploadToIpfs(result.localPath)
    // Удаляем temp файл
    try {
      fs.unlinkSync(result.localPath)
    } catch {
      /* ignore */
    }
    if (!ipfsResult?.cid) {
      log.warn('uploadToIpfs вернул null', { localPath: result.localPath })
      return null
    }
    log.info('Изображение восстановлено через Shikimori', {
      imageUrl: opts.imageUrl,
      newCid: ipfsResult.cid,
    })
    return ipfsResult.cid
  } catch (error) {
    log.warn('recoverShikimoriImage failed', {
      imageUrl: opts.imageUrl,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Восстановить sprite.webp + sprite.vtt путём скачивания video.webm из IPFS
 * и регенерации через ffmpeg.
 *
 * @param opts.videoCid - CID живого video.webm (должен быть достижим)
 * @param opts.durationMs - длительность видео в миллисекундах (из БД)
 * @returns новые CID или null если что-то сломалось
 */
export async function recoverSprite(opts: {
  videoCid: string
  durationMs: number
}): Promise<{ spriteCid: string; vttCid: string } | null> {
  if (opts.durationMs <= 0) {
    log.warn('recoverSprite: durationMs <= 0', opts)
    return null
  }

  // Скачиваем video.webm в temp, потом генерируем спрайт
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'animatrona-sprite-'))
  const videoTempPath = path.join(tempDir, 'video.webm')
  const outputDir = tempDir // generateThumbnailSprite создаст subdir thumbnails/

  try {
    log.info('recoverSprite: скачиваю video из IPFS', { videoCid: opts.videoCid })
    await saveToFile(opts.videoCid, videoTempPath)

    const durationSec = opts.durationMs / 1000
    const result = await generateThumbnailSprite(videoTempPath, outputDir, durationSec, {
      frameCount: 100,
      frameWidth: 160,
      frameHeight: 90,
      columns: 10,
      quality: 75,
    })

    if (!result.spritePath || !result.vttPath) {
      log.warn('recoverSprite: ffmpeg не создал sprite или vtt')
      return null
    }

    const [spriteUpload, vttUpload] = await Promise.all([uploadToIpfs(result.spritePath), uploadToIpfs(result.vttPath)])

    if (!spriteUpload?.cid || !vttUpload?.cid) {
      log.warn('recoverSprite: upload sprite/vtt вернул null')
      return null
    }

    log.info('Sprite восстановлен из video.webm', {
      videoCid: opts.videoCid,
      spriteCid: spriteUpload.cid,
      vttCid: vttUpload.cid,
    })

    return { spriteCid: spriteUpload.cid, vttCid: vttUpload.cid }
  } catch (error) {
    log.warn('recoverSprite failed', {
      videoCid: opts.videoCid,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  } finally {
    // Очищаем temp
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

/**
 * Восстановить thumbnails-img (мелкие 320px-превью) из video.webm.
 *
 * @param opts.videoCid - CID video.webm
 * @param opts.durationMs - длительность видео в мс
 * @param opts.count - сколько превью генерировать (по умолчанию 5 — как при импорте)
 * @returns массив новых CID или null
 */
export async function recoverThumbnailsImg(opts: {
  videoCid: string
  durationMs: number
  count?: number
}): Promise<string[] | null> {
  if (opts.durationMs <= 0) {
    log.warn('recoverThumbnailsImg: durationMs <= 0', opts)
    return null
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'animatrona-thumbs-'))
  const videoTempPath = path.join(tempDir, 'video.webm')

  try {
    log.info('recoverThumbnailsImg: скачиваю video из IPFS', { videoCid: opts.videoCid })
    await saveToFile(opts.videoCid, videoTempPath)

    const durationSec = opts.durationMs / 1000
    const result = await generateScreenshots(videoTempPath, tempDir, durationSec, {
      count: opts.count ?? 5,
      format: 'webp',
      thumbnailWidth: 320,
      fullWidth: 1280,
      quality: 80,
    })

    if (!result.thumbnails?.length) {
      log.warn('recoverThumbnailsImg: ffmpeg не создал thumbnails')
      return null
    }

    const uploads = await Promise.all(result.thumbnails.map((p) => uploadToIpfs(p)))
    const cids = uploads.filter((u): u is NonNullable<typeof u> => u !== null).map((u) => u.cid)

    if (cids.length === 0) {
      log.warn('recoverThumbnailsImg: все uploads null')
      return null
    }

    log.info('Thumbnails-img восстановлены из video.webm', {
      videoCid: opts.videoCid,
      count: cids.length,
    })

    return cids
  } catch (error) {
    log.warn('recoverThumbnailsImg failed', {
      videoCid: opts.videoCid,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

/**
 * Сгенерировать минимальный metadata.json из данных БД.
 *
 * Используется когда оригинальный ffprobe metadata.json потерян.
 * Восстанавливаем валидный JSON с тем что есть в БД (videoWidth, videoHeight, durationMs, ...).
 *
 * @returns CID нового metadata.json или null
 */
export async function regenerateMetadataJson(episode: {
  durationMs: number | null
  videoWidth: number | null
  videoHeight: number | null
  videoBitDepth: number | null
}): Promise<string | null> {
  try {
    const minimal = {
      version: 1,
      regeneratedAt: new Date().toISOString(),
      regenerated: true,
      streams: [
        {
          codec_type: 'video',
          width: episode.videoWidth ?? undefined,
          height: episode.videoHeight ?? undefined,
          bits_per_raw_sample: episode.videoBitDepth ?? undefined,
        },
      ],
      format: {
        duration: episode.durationMs ? (episode.durationMs / 1000).toFixed(3) : undefined,
      },
    }

    // Сохраняем во временный файл и загружаем
    const tempPath = path.join(app.getPath('temp'), `metadata-${Date.now()}.json`)
    fs.writeFileSync(tempPath, JSON.stringify(minimal, null, 2), 'utf-8')

    const result = await uploadToIpfs(tempPath)
    try {
      fs.unlinkSync(tempPath)
    } catch {
      /* ignore */
    }

    return result?.cid ?? null
  } catch (error) {
    log.warn('regenerateMetadataJson failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Восстановить главы (chapters.json) для аниме через автоматическое обнаружение OP/ED.
 *
 * Скачивает аудиодорожки (.opus) каждого эпизода и прогоняет через `detectIntros`
 * (Chromaprint fingerprinting) для нахождения совпадающих регионов между эпизодами.
 * Это даёт OP/ED markers даже без локального исходного mkv.
 *
 * Минимум 2 эпизода с живым audioCid для работы алгоритма.
 *
 * @param opts.episodes - все эпизоды аниме (нужно ≥2 для сравнения)
 * @returns Map<episodeId, chaptersCid> — для эпизодов где OP/ED обнаружены
 */
export async function recoverChapters(opts: {
  episodes: Array<{ id: string; audioCid: string; durationMs: number; number: number }>
  onDetail?: (level: 'info' | 'warn' | 'success', message: string) => void
}): Promise<Map<string, string>> {
  const detail = (level: 'info' | 'warn' | 'success', msg: string) => opts.onDetail?.(level, msg)
  const result = new Map<string, string>()
  const eligible = opts.episodes.filter((ep) => ep.audioCid && ep.durationMs > 0)
  if (eligible.length < 2) {
    log.warn('recoverChapters: нужно минимум 2 эпизода с аудиодорожкой, пропускаем', {
      eligibleCount: eligible.length,
    })
    return result
  }

  // Создаём общий tempDir для всех скачиваний — освободим в finally
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'animatrona-chapters-'))

  try {
    // 1. Скачиваем аудиодорожки параллельно (не больше 3 одновременно — пинеры)
    log.info(`recoverChapters: скачиваю аудиодорожки для ${eligible.length} эпизодов из IPFS...`)
    const epPaths = new Map<string, string>() // episodeId → local path
    const epNumById = new Map(eligible.map((ep) => [ep.id, ep.number]))
    let downloaded = 0
    const concurrency = 3
    for (let i = 0; i < eligible.length; i += concurrency) {
      const batch = eligible.slice(i, i + concurrency)
      await Promise.all(
        batch.map(async (ep) => {
          const localPath = path.join(tempDir, `${ep.id}.opus`)
          detail('info', `     ↓ ep.${ep.number}: скачиваю аудио…`)
          try {
            await saveToFile(ep.audioCid, localPath)
            epPaths.set(ep.id, localPath)
            downloaded++
            detail('info', `     ✓ ep.${ep.number}: аудио получено (${downloaded}/${eligible.length})`)
          } catch (err) {
            log.warn(`recoverChapters: не удалось скачать аудио для ep.${ep.number}`, {
              audioCid: ep.audioCid,
              error: String(err),
            })
            detail('warn', `     ✗ ep.${ep.number}: ошибка — ${err instanceof Error ? err.message : String(err)}`)
          }
        }),
      )
    }

    if (epPaths.size < 2) {
      log.warn('recoverChapters: меньше 2 аудиодорожек скачалось, отмена')
      detail('warn', `     ⚠ скачалось только ${epPaths.size} из ${eligible.length}, нужно ≥2 — отмена`)
      return result
    }

    // 2. Запускаем detectIntros по скачанным файлам
    const detectorInput = eligible
      .filter((ep) => epPaths.has(ep.id))
      .map((ep) => ({
        id: ep.id,
        sourcePath: epPaths.get(ep.id) as string,
        duration: ep.durationMs,
      }))

    log.info(`recoverChapters: запуск detectIntros для ${detectorInput.length} эпизодов...`)
    detail('info', `     ↻ fingerprinting ${detectorInput.length} аудиодорожек…`)
    const detected = await detectIntros(detectorInput)

    // 3. Для каждого эпизода, где детектор нашёл OP или ED — строим ChaptersDocument
    for (const det of detected) {
      const epNum = epNumById.get(det.episodeId) ?? '?'
      const chapters = buildChaptersFromDetection(det)
      if (chapters.length === 0) {
        detail('info', `     — ep.${epNum}: паттерн не найден`)
        continue
      }
      const chapterDesc = chapters
        .map((c) => {
          const start = msToTimecode(c.startMs)
          const end = msToTimecode(c.endMs)
          return `${c.type.toUpperCase()} ${start}–${end}`
        })
        .join('  ')
      try {
        const doc = { version: 1, chapters }
        const cid = await addBytes(Buffer.from(JSON.stringify(doc), 'utf-8'))
        result.set(det.episodeId, cid)
        detail('success', `     ✓ ep.${epNum}: ${chapterDesc}`)
        log.info('recoverChapters: ChaptersDocument опубликован', {
          episodeId: det.episodeId,
          chaptersCid: cid,
          chaptersCount: chapters.length,
        })
      } catch (err) {
        log.warn('recoverChapters: upload ChaptersDocument упал', {
          episodeId: det.episodeId,
          error: String(err),
        })
        detail('warn', `     ✗ ep.${epNum}: ошибка публикации — ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return result
  } catch (error) {
    log.warn('recoverChapters failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return result
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

/** Преобразовать результат detectIntros в массив ManifestChapter */
function buildChaptersFromDetection(det: IntroDetectorResult): Array<{
  startMs: number
  endMs: number
  title: string | null
  type: string
  skippable: boolean
}> {
  const chapters: Array<{
    startMs: number
    endMs: number
    title: string | null
    type: string
    skippable: boolean
  }> = []
  if (det.introStartMs != null && det.introEndMs != null) {
    chapters.push({
      startMs: det.introStartMs,
      endMs: det.introEndMs,
      title: 'Opening',
      type: 'op',
      skippable: true,
    })
  }
  if (det.outroStartMs != null && det.outroEndMs != null) {
    chapters.push({
      startMs: det.outroStartMs,
      endMs: det.outroEndMs,
      title: 'Ending',
      type: 'ed',
      skippable: true,
    })
  }
  return chapters
}

function msToTimecode(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

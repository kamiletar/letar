/**
 * Подготовка «неудобного» файла к воспроизведению — ffmpeg перекладывает его в MP4, который
 * Chromium играет штатно (PLAN.md §10, Фаза 6).
 *
 * **Почему целый файл, а не потоковый HLS.** План изначально предполагал локальный HTTP +
 * HLS-сегменты с перезапуском ffmpeg на перемотку (как у Jellyfin). От этого пути сознательно
 * отказались в v1: он требует самому генерировать плейлист с расчётными длительностями
 * сегментов, а при `-c:v copy` ffmpeg режет по реальным keyframe — заявленные и фактические
 * границы расходятся, и перемотка начинает врать. Готовый файл целиком даёт точную перемотку
 * бесплатно (обычный seek по MP4), кэшируется тривиально и не зависит от живого процесса.
 * Плата — ожидание перед стартом: для самого частого случая (перекодируется только звук)
 * это десятки секунд на серию, для Hi10P-видео — минуты, и об этом честно предупреждает UI.
 *
 * Результат кэшируется по содержимому исходника (`mtime`+`size`), поэтому повторный просмотр
 * той же серии стартует мгновенно.
 */

import { createModuleLogger } from '@letar/folder-scan'
import { app } from 'electron'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'

import type { TranscodePlan } from '@shared/transcode-plan'
import { buildCodecArgs } from '@shared/transcode-plan'
import { getFfmpegStatus } from './ffmpeg-installer.service'

const log = createModuleLogger('Transcode')

/** Потолок кэша готовых файлов — при превышении вытесняются самые давние по времени изменения */
const CACHE_LIMIT_BYTES = 20 * 1024 * 1024 * 1024

export interface TranscodeProgress {
  /** Доля выполнения 0..100; `undefined`, пока неизвестна длительность исходника */
  percent?: number
  /** Обработано секунд исходника */
  processedSec: number
  /** Всего секунд в исходнике (0 — неизвестно) */
  totalSec: number
  /** Скорость относительно реального времени, как её сообщает ffmpeg (`1.0` = реалтайм) */
  speed: number | null
}

export interface TranscodeRequest {
  filePath: string
  plan: TranscodePlan
  /** Длительность исходника в миллисекундах (из mediainfo) — нужна только для прогресса */
  durationMs?: number
  /** Индекс звуковой дорожки в контейнере; по умолчанию первая */
  audioTrackIndex?: number
}

export interface TranscodeResult {
  /** Путь к готовому файлу, который можно отдавать в `<video>` через `media://` */
  outputPath: string
  /** Файл уже лежал в кэше — обработка не запускалась */
  fromCache: boolean
}

function getCacheDir(): string {
  return path.join(app.getPath('userData'), 'transcoded')
}

/**
 * Ключ кэша учитывает и сам файл (`mtime`+`size`), и стратегию — перезалитая раздача с тем же
 * именем или другая выбранная дорожка дают другой ключ, а не протухший результат.
 */
async function buildCacheKey(request: TranscodeRequest): Promise<string> {
  const stats = await stat(request.filePath)
  const parts = [
    request.filePath,
    String(stats.mtimeMs),
    String(stats.size),
    request.plan.strategy,
    String(request.audioTrackIndex ?? 'default'),
  ]
  return createHash('sha1').update(parts.join('|')).digest('hex')
}

let activeProcess: ChildProcess | null = null
let cancelled = false

/** Разбор `-progress pipe:1`: строки `ключ=значение`, блок закрывается `progress=continue|end` */
function parseProgressChunk(chunk: string, totalSec: number): TranscodeProgress | null {
  const values = new Map<string, string>()
  for (const line of chunk.split('\n')) {
    const [key, value] = line.split('=')
    if (key && value !== undefined) {
      values.set(key.trim(), value.trim())
    }
  }

  const outTimeUs = Number.parseInt(values.get('out_time_us') ?? values.get('out_time_ms') ?? '', 10)
  if (!Number.isFinite(outTimeUs)) {
    return null
  }

  const processedSec = outTimeUs / 1_000_000
  const rawSpeed = Number.parseFloat((values.get('speed') ?? '').replace('x', ''))

  return {
    processedSec,
    totalSec,
    percent: totalSec > 0 ? Math.min(99, Math.round((processedSec / totalSec) * 100)) : undefined,
    speed: Number.isFinite(rawSpeed) ? rawSpeed : null,
  }
}

function buildFfmpegArgs(request: TranscodeRequest, outputPath: string): string[] {
  const audioIndex = request.audioTrackIndex ?? 0

  return [
    '-y',
    '-hide_banner',
    '-nostdin',
    '-i',
    request.filePath,
    // Субтитры намеренно не переносим: приложение рендерит их отдельно из ОРИГИНАЛЬНОГО файла
    // (matroska-subtitles + SubtitlesOctopus), и вшивать их в поток не нужно
    '-map',
    '0:v:0',
    '-map',
    `0:a:${audioIndex}?`,
    ...buildCodecArgs(request.plan),
    // moov-атом в начало — иначе Chromium не сможет перематывать, пока не дочитает файл
    '-movflags',
    '+faststart',
    '-progress',
    'pipe:1',
    '-nostats',
    outputPath,
  ]
}

/**
 * То же самое, но вывод — фрагментированный MP4 в stdout (`pipe:1`), пригодный для потокового
 * добавления в `MediaSource.SourceBuffer` по мере поступления байт. Прогресс уводим на отдельный
 * дескриптор `pipe:3` (в `stdio` третий индекс сверх `stdin/stdout/stderr`), иначе он смешается
 * с самими медиаданными на stdout.
 */
function buildStreamingFfmpegArgs(request: TranscodeRequest): string[] {
  const audioIndex = request.audioTrackIndex ?? 0

  return [
    '-y',
    '-hide_banner',
    '-nostdin',
    '-i',
    request.filePath,
    '-map',
    '0:v:0',
    '-map',
    `0:a:${audioIndex}?`,
    ...buildCodecArgs(request.plan),
    // Фрагментированный MP4 — без финального moov-атома, можно писать в неперематываемый вывод
    // (stdout) и начинать воспроизведение до завершения кодирования всего файла
    '-movflags',
    'frag_keyframe+empty_moov+default_base_moof',
    '-progress',
    'pipe:3',
    '-nostats',
    'pipe:1',
  ]
}

/**
 * Готовит файл к воспроизведению. Возвращает путь к готовому MP4 — либо из кэша, либо только
 * что созданный. Бросает, если ffmpeg недоступен, отменён или завершился с ошибкой.
 */
export async function transcodeFile(
  request: TranscodeRequest,
  onProgress?: (progress: TranscodeProgress) => void,
): Promise<TranscodeResult> {
  const status = await getFfmpegStatus()
  if (!status.available || !status.ffmpegPath) {
    throw new Error('ffmpeg не установлен — включите расширенную поддержку форматов')
  }

  const cacheDir = getCacheDir()
  await mkdir(cacheDir, { recursive: true })

  const outputPath = path.join(cacheDir, `${await buildCacheKey(request)}.mp4`)
  if (existsSync(outputPath)) {
    log.info('Готовый файл взят из кэша', { outputPath })
    return { outputPath, fromCache: true }
  }

  const partialPath = `${outputPath}.part.mp4`
  const totalSec = (request.durationMs ?? 0) / 1000
  cancelled = false

  await new Promise<void>((resolve, reject) => {
    const args = buildFfmpegArgs(request, partialPath)
    log.info('Запуск ffmpeg', { strategy: request.plan.strategy, file: request.filePath })

    const child = spawn(status.ffmpegPath as string, args, { windowsHide: true })
    activeProcess = child

    let stderrTail = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      const progress = parseProgressChunk(chunk.toString(), totalSec)
      if (progress) {
        onProgress?.(progress)
      }
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      // Держим только хвост — при ошибке он и есть сообщение ffmpeg
      stderrTail = (stderrTail + chunk.toString()).slice(-2000)
    })

    child.on('error', (error) => reject(error))
    child.on('close', (code) => {
      activeProcess = null
      if (cancelled) {
        reject(new Error('Подготовка отменена'))
        return
      }
      if (code !== 0) {
        reject(new Error(`ffmpeg завершился с кодом ${code}: ${stderrTail.trim().split('\n').slice(-3).join(' ')}`))
        return
      }
      resolve()
    })
  }).catch(async (error) => {
    await rm(partialPath, { force: true }).catch(() => {})
    throw error
  })

  // Переименование в целевое имя — последний шаг: пока файл называется `.part.mp4`, кэш его
  // не отдаст, поэтому прерванная подготовка не может выглядеть как готовый результат
  await rename(partialPath, outputPath)

  onProgress?.({ percent: 100, processedSec: totalSec, totalSec, speed: null })
  await pruneCache().catch((error) => log.warn('Не удалось почистить кэш', { error: String(error) }))

  return { outputPath, fromCache: false }
}

export interface StreamingTranscodeHandlers {
  onChunk: (chunk: Buffer) => void
  onProgress: (progress: TranscodeProgress) => void
  onEnd: (result: TranscodeResult) => void
  onError: (message: string) => void
}

export type StreamingTranscodeStart = { cached: true; outputPath: string } | { cached: false }

/**
 * Потоковый вариант `transcodeFile` — не ждёт завершения, а зовёт `handlers.onChunk` по мере
 * поступления байт от ffmpeg (см. `buildStreamingFfmpegArgs`). Параллельно пишет те же байты на
 * диск в кэш — при удачном завершении повторный просмотр той же серии, как и раньше, мгновенный.
 *
 * Функция сама не бросает и не возвращает Promise, привязанный к завершению всего файла —
 * результат (`onEnd`/`onError`) приходит позже через колбэки, а не через возврат функции.
 * Если файл уже в кэше — стриминг не нужен, возвращается `{ cached: true, outputPath }`
 * синхронно, и вызывающая сторона использует обычный путь воспроизведения готового файла.
 */
export async function startStreamingTranscode(
  request: TranscodeRequest,
  handlers: StreamingTranscodeHandlers,
): Promise<StreamingTranscodeStart> {
  const status = await getFfmpegStatus()
  if (!status.available || !status.ffmpegPath) {
    throw new Error('ffmpeg не установлен — включите расширенную поддержку форматов')
  }

  const cacheDir = getCacheDir()
  await mkdir(cacheDir, { recursive: true })

  const outputPath = path.join(cacheDir, `${await buildCacheKey(request)}.mp4`)
  if (existsSync(outputPath)) {
    log.info('Готовый файл взят из кэша (потоковый запрос)', { outputPath })
    return { cached: true, outputPath }
  }

  const partialPath = `${outputPath}.part.mp4`
  const totalSec = (request.durationMs ?? 0) / 1000
  cancelled = false

  const args = buildStreamingFfmpegArgs(request)
  log.info('Запуск ffmpeg (потоковый режим)', { strategy: request.plan.strategy, file: request.filePath })

  const child = spawn(status.ffmpegPath, args, {
    windowsHide: true,
    // Индекс 3 сверх stdin/stdout/stderr — отдельный канал под `-progress pipe:3`
    stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
  })
  activeProcess = child

  const cacheWrite = createWriteStream(partialPath)
  let stderrTail = ''
  let progressBuf = ''

  child.stdout?.on('data', (chunk: Buffer) => {
    cacheWrite.write(chunk)
    handlers.onChunk(chunk)
  })

  const progressPipe = child.stdio[3] as NodeJS.ReadableStream | undefined
  progressPipe?.on('data', (chunk: Buffer) => {
    progressBuf += chunk.toString()
    const blocks = progressBuf.split('progress=')
    progressBuf = blocks.pop() ?? ''
    for (const block of blocks) {
      const progress = parseProgressChunk(block, totalSec)
      if (progress) {
        handlers.onProgress(progress)
      }
    }
  })

  child.stderr?.on('data', (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-2000)
  })

  child.on('error', (error) => {
    activeProcess = null
    cacheWrite.destroy()
    rm(partialPath, { force: true }).catch(() => {})
    handlers.onError(error.message)
  })

  child.on('close', (code) => {
    activeProcess = null
    cacheWrite.end()
    if (cancelled) {
      rm(partialPath, { force: true }).catch(() => {})
      handlers.onError('Подготовка отменена')
      return
    }
    if (code !== 0) {
      rm(partialPath, { force: true }).catch(() => {})
      handlers.onError(`ffmpeg завершился с кодом ${code}: ${stderrTail.trim().split('\n').slice(-3).join(' ')}`)
      return
    }

    rename(partialPath, outputPath)
      .then(() => pruneCache().catch((error) => log.warn('Не удалось почистить кэш', { error: String(error) })))
      .then(() => handlers.onEnd({ outputPath, fromCache: false }))
      .catch((error) => handlers.onError(error instanceof Error ? error.message : String(error)))
  })

  return { cached: false }
}

/** Прерывает идущую подготовку — `transcodeFile` отклонится и удалит частичный файл */
export function cancelTranscode(): void {
  cancelled = true
  activeProcess?.kill()
  activeProcess = null
}

/** Суммарный размер кэша готовых файлов */
export async function getTranscodeCacheSize(): Promise<number> {
  const cacheDir = getCacheDir()
  if (!existsSync(cacheDir)) {
    return 0
  }
  const entries = await readdir(cacheDir, { withFileTypes: true })
  const sizes = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => (await stat(path.join(cacheDir, entry.name))).size),
  )
  return sizes.reduce((sum, size) => sum + size, 0)
}

/** Полная очистка кэша — по кнопке в UI */
export async function clearTranscodeCache(): Promise<void> {
  await rm(getCacheDir(), { recursive: true, force: true })
}

/** Вытесняет самые давние файлы, пока кэш не уложится в лимит */
async function pruneCache(): Promise<void> {
  const cacheDir = getCacheDir()
  const entries = await readdir(cacheDir, { withFileTypes: true })
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.mp4'))
      .map(async (entry) => {
        const fullPath = path.join(cacheDir, entry.name)
        const stats = await stat(fullPath)
        return { fullPath, size: stats.size, mtimeMs: stats.mtimeMs }
      }),
  )

  let total = files.reduce((sum, file) => sum + file.size, 0)
  if (total <= CACHE_LIMIT_BYTES) {
    return
  }

  for (const file of files.sort((a, b) => a.mtimeMs - b.mtimeMs)) {
    if (total <= CACHE_LIMIT_BYTES) {
      break
    }
    await rm(file.fullPath, { force: true })
    total -= file.size
    log.info('Вытеснен файл кэша', { file: file.fullPath })
  }
}

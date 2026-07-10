/**
 * Pre-encode шаг для реимпорта битых эпизодов
 *
 * Пережимает исходный видеофайл в H264 (libx264) во временный файл,
 * чтобы стандартный import pipeline мог работать с "чистым" источником.
 * Оригинальный файл НЕ изменяется.
 */

import { existsSync, unlinkSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'

import { isProgressLine, parseTimeToSeconds } from '../../ffmpeg/progress-parser'
import { runFFprobe, spawnFFmpeg } from '../../utils/ffmpeg-spawn'
import { createModuleLogger } from '../../utils/logger'

const log = createModuleLogger('PreEncode')

/** Настройки pre-encode */
export interface PreEncodeOptions {
  /** CRF значение (дефолт 14 — с запасом качества) */
  crf?: number
  /** Preset libx264 (дефолт medium) */
  preset?: string
}

/** Дефолтные настройки */
const DEFAULT_CRF = 14
const DEFAULT_PRESET = 'medium'

/** Результат pre-encode */
export interface PreEncodeResult {
  /** Путь к пережатому временному файлу */
  tempPath: string
  /** Путь к оригинальному файлу (для информации) */
  originalPath: string
}

/**
 * Получить длительность видео через FFprobe (в секундах)
 */
async function probeDuration(filePath: string): Promise<number> {
  const { stdout } = await runFFprobe(['-v', 'quiet', '-print_format', 'json', '-show_format', filePath])
  const data = JSON.parse(stdout)
  return parseFloat(data.format?.duration ?? '0')
}

/**
 * Пережать видеофайл в H264 (libx264) во временный файл
 *
 * @param sourcePath Путь к исходному видеофайлу
 * @param options Настройки кодирования
 * @param onProgress Callback прогресса (0-100)
 * @param signal AbortSignal для отмены
 * @returns Путь к временному файлу
 */
export async function preEncodeFile(
  sourcePath: string,
  options?: PreEncodeOptions,
  onProgress?: (percent: number) => void,
  signal?: { cancelled: boolean }
): Promise<PreEncodeResult> {
  if (!existsSync(sourcePath)) {
    throw new Error(`Pre-encode: исходный файл не найден: ${sourcePath}`)
  }

  const crf = options?.crf ?? DEFAULT_CRF
  const preset = options?.preset ?? DEFAULT_PRESET
  const ext = extname(sourcePath)
  const name = basename(sourcePath, ext)
  const dir = dirname(sourcePath)

  // Временный файл рядом с оригиналом
  const tempPath = join(dir, `_pre-encoded_${name}.mkv`)

  // Удалить предыдущий temp если остался
  if (existsSync(tempPath)) {
    unlinkSync(tempPath)
  }

  log.info('Pre-encode: старт', { sourcePath, tempPath, crf, preset })

  // Получить длительность для расчёта прогресса
  const duration = await probeDuration(sourcePath)
  if (duration <= 0) {
    log.warn('Pre-encode: не удалось определить длительность, прогресс будет неточным')
  }

  // Собираем аргументы FFmpeg
  const args = [
    '-y',
    '-hide_banner',
    '-i',
    sourcePath,
    '-c:v',
    'libx264',
    '-crf',
    String(crf),
    '-preset',
    preset,
    '-c:a',
    'copy',
    '-c:s',
    'copy',
    tempPath,
  ]

  return new Promise<PreEncodeResult>((resolve, reject) => {
    const proc = spawnFFmpeg(args)
    let stderrBuffer = ''

    proc.stderr.on('data', (data: Buffer) => {
      stderrBuffer += data.toString()
      const lines = stderrBuffer.split(/\r\n|\r|\n/)
      stderrBuffer = lines.pop() || ''

      for (const line of lines) {
        if (isProgressLine(line) && duration > 0) {
          const timeSeconds = parseTimeToSeconds(line)
          if (timeSeconds !== null) {
            const percent = Math.min(99, Math.round((timeSeconds / duration) * 100))
            onProgress?.(percent)
          }
        }
      }
    })

    proc.on('error', (err) => {
      // Очистка temp при ошибке
      cleanupTemp(tempPath)
      reject(new Error(`Pre-encode: ошибка запуска FFmpeg: ${err.message}`))
    })

    proc.on('close', (code) => {
      if (signal?.cancelled) {
        cleanupTemp(tempPath)
        reject(new Error('Pre-encode: отменено пользователем'))
        return
      }

      if (code === 0) {
        if (!existsSync(tempPath)) {
          reject(new Error('Pre-encode: FFmpeg завершился успешно, но выходной файл не найден'))
          return
        }
        onProgress?.(100)
        log.info('Pre-encode: завершён', { tempPath })
        resolve({ tempPath, originalPath: sourcePath })
      } else {
        cleanupTemp(tempPath)
        reject(new Error(`Pre-encode: FFmpeg завершился с кодом ${code}`))
      }
    })

    // Поддержка отмены — проверяем периодически
    if (signal) {
      const checkInterval = setInterval(() => {
        if (signal.cancelled) {
          clearInterval(checkInterval)
          try {
            proc.kill('SIGTERM')
          } catch {
            /* уже завершён */
          }
        }
      }, 500)
      proc.on('close', () => clearInterval(checkInterval))
    }
  })
}

/**
 * Удалить временный pre-encode файл (безопасно)
 */
export function cleanupPreEncodeTemp(tempPath: string): void {
  cleanupTemp(tempPath)
}

function cleanupTemp(tempPath: string): void {
  try {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath)
      log.debug('Pre-encode: temp файл удалён', { tempPath })
    }
  } catch (err) {
    log.warn('Pre-encode: не удалось удалить temp файл', { tempPath, error: String(err) })
  }
}

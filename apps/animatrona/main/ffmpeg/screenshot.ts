/**
 * FFmpeg модуль — генерация скриншотов из видео
 */

import { existsSync, mkdirSync, statSync } from 'fs'
import { join } from 'path'
import { spawnFFmpeg } from '../utils/ffmpeg-spawn'

/**
 * Опции для извлечения кадра
 */
export interface FrameOptions {
  /** Формат изображения */
  format: 'webp' | 'jpg' | 'png'
  /** Ширина (высота подстраивается автоматически) */
  width?: number
  /** Качество (1-100 для webp/jpg, игнорируется для png) */
  quality?: number
}

/**
 * Опции для генерации нескольких скриншотов
 */
export interface ScreenshotOptions {
  /** Количество скриншотов */
  count: number
  /** Формат изображения */
  format: 'webp' | 'jpg' | 'png'
  /** Ширина thumbnail (по умолчанию 320) */
  thumbnailWidth?: number
  /** Ширина полноразмерного (по умолчанию 1280) */
  fullWidth?: number
  /** Качество (по умолчанию 90) */
  quality?: number
  /** Качество для full-size (по умолчанию 95) */
  fullQuality?: number
  /** Пропустить первые N% видео (по умолчанию 10%) */
  skipStartPercent?: number
  /** Максимум параллельных FFmpeg процессов (по умолчанию 4) */
  maxConcurrent?: number
  /** Колбэк прогресса: (завершено, всего) */
  onProgress?: (current: number, total: number) => void
}

/**
 * Простой лимитер параллельности (аналог p-limit)
 */
function createLimiter(concurrency: number) {
  let running = 0
  const queue: Array<() => void> = []

  const next = () => {
    if (queue.length > 0 && running < concurrency) {
      running++
      const fn = queue.shift()
      if (fn) {
        fn()
      }
    }
  }

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const run = async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          running--
          next()
        }
      }

      queue.push(run)
      next()
    })
  }
}

/**
 * Результат генерации скриншотов
 */
export interface ScreenshotResult {
  /** Пути к thumbnail-ам (маленькие) */
  thumbnails: string[]
  /** Пути к полноразмерным скриншотам */
  fullSize: string[]
}

/**
 * Извлечь один кадр из видео
 *
 * @param inputPath - Путь к видеофайлу
 * @param outputPath - Путь для сохранения изображения
 * @param timeSeconds - Время в секундах
 * @param options - Опции извлечения
 */
export function extractFrame(
  inputPath: string,
  outputPath: string,
  timeSeconds: number,
  options: FrameOptions = { format: 'webp' },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { format, width, quality = 80 } = options

    // Собираем фильтры видео
    const videoFilters: string[] = []
    if (width) {
      // scale=width:-1 сохраняет пропорции
      videoFilters.push(`scale=${width}:-1`)
    }

    // Аргументы FFmpeg
    const args: string[] = [
      '-y', // Перезаписать файл
      '-ss',
      timeSeconds.toString(), // Seek до нужного времени (до -i для быстрого seek)
      '-i',
      inputPath,
      '-frames:v',
      '1', // Только один кадр
    ]

    // Добавляем фильтры если есть
    if (videoFilters.length > 0) {
      args.push('-vf', videoFilters.join(','))
    }

    // Конвертируем в 8-bit для совместимости с image encoders (10-bit p010le не поддерживается)
    args.push('-pix_fmt', 'rgb24')

    // Настройки формата
    if (format === 'webp') {
      args.push('-c:v', 'libwebp')
      args.push('-quality', quality.toString())
    } else if (format === 'jpg') {
      args.push('-q:v', Math.round((100 - quality) / 3.33).toString()) // JPEG quality 1-31 (инвертированный)
    }
    // PNG не требует настроек качества

    args.push(outputPath)

    const ff = spawnFFmpeg(args)

    let stderr = ''
    ff.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ff.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg extractFrame failed: ${stderr.slice(-500)}`))
      }
    })

    ff.on('error', reject)
  })
}

/**
 * Генерировать скриншоты для эпизода
 *
 * Создаёт два набора изображений:
 * - thumbnails: маленькие (320px) для карточек и hover preview
 * - fullSize: большие (1280px) для лайтбокса
 *
 * @param inputPath - Путь к видеофайлу
 * @param outputDir - Папка для сохранения
 * @param duration - Длительность видео в секундах
 * @param options - Опции генерации
 */
export async function generateScreenshots(
  inputPath: string,
  outputDir: string,
  duration: number,
  options: ScreenshotOptions,
): Promise<ScreenshotResult> {
  const {
    count,
    format = 'webp',
    thumbnailWidth = 320,
    fullWidth = 1280,
    quality = 90, // Увеличено с 80 до 90 для лучшего качества
    fullQuality = 95, // Отдельное качество для full-size
    skipStartPercent = 10,
    maxConcurrent = 4, // Ограничение параллельности для защиты SSD
    onProgress,
  } = options

  // Создаём папку screenshots если не существует
  const screenshotsDir = join(outputDir, 'screenshots')
  if (!existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir, { recursive: true })
  }

  // Вычисляем тайминги — пропускаем начало и конец
  const startTime = duration * (skipStartPercent / 100)
  const endTime = duration * 0.95 // Не берём последние 5%
  const interval = (endTime - startTime) / (count + 1)

  const times: number[] = []
  for (let i = 1; i <= count; i++) {
    times.push(startTime + interval * i)
  }

  const thumbnails: string[] = []
  const fullSize: string[] = []

  // Создаём лимитер для ограничения параллельных FFmpeg процессов
  // Это предотвращает перегрузку SSD при генерации скриншотов для нескольких эпизодов
  const limit = createLimiter(maxConcurrent)

  // Счётчик завершённых кадров для прогресса
  let completedFrames = 0

  // Генерируем скриншоты с ограниченной параллельностью
  const promises = times.map((time, index) =>
    limit(async () => {
      const paddedIndex = String(index + 1).padStart(2, '0')
      const ext = format

      // Thumbnail (меньшее качество для экономии места)
      const thumbPath = join(screenshotsDir, `thumb_${paddedIndex}.${ext}`)
      await extractFrame(inputPath, thumbPath, time, {
        format,
        width: thumbnailWidth,
        quality,
      })
      thumbnails.push(thumbPath)

      // Full size (максимальное качество для лайтбокса)
      const fullPath = join(screenshotsDir, `screenshot_${paddedIndex}.${ext}`)
      await extractFrame(inputPath, fullPath, time, {
        format,
        width: fullWidth,
        quality: fullQuality,
      })
      fullSize.push(fullPath)

      completedFrames++
      onProgress?.(completedFrames, count)
    })
  )

  await Promise.all(promises)

  // Сортируем по индексу (Promise.all не гарантирует порядок)
  thumbnails.sort()
  fullSize.sort()

  return { thumbnails, fullSize }
}

/**
 * Получить размер файла скриншота
 */
export function getScreenshotSize(path: string): number {
  try {
    return statSync(path).size
  } catch {
    return 0
  }
}

/**
 * Опции для генерации sprite sheet для hover preview
 */
export interface SpriteSheetOptions {
  /** Количество кадров (по умолчанию 100) */
  frameCount?: number
  /** Ширина одного кадра (по умолчанию 160px) */
  frameWidth?: number
  /** Высота одного кадра (по умолчанию 90px для 16:9) */
  frameHeight?: number
  /** Количество колонок в спрайте (по умолчанию 10) */
  columns?: number
  /** Качество JPEG (по умолчанию 75) */
  quality?: number
}

/**
 * Результат генерации sprite sheet
 */
export interface SpriteSheetResult {
  /** Путь к sprite sheet изображению */
  spritePath: string
  /** Путь к VTT файлу с таймингами */
  vttPath: string
  /** Размер sprite sheet в байтах */
  spriteSize: number
}

/**
 * Генерирует VTT файл с метками времени для sprite sheet
 *
 * Формат VTT:
 * WEBVTT
 *
 * 00:00:00.000 --> 00:00:05.000
 * sprite.jpg#xywh=0,0,160,90
 */
function generateSpriteVTT(
  spriteFileName: string,
  duration: number,
  frameCount: number,
  frameWidth: number,
  frameHeight: number,
  columns: number,
): string {
  const lines: string[] = ['WEBVTT', '']

  // Интервал между кадрами
  const interval = duration / frameCount

  for (let i = 0; i < frameCount; i++) {
    const startTime = i * interval
    const endTime = (i + 1) * interval

    // Позиция кадра в сетке
    const col = i % columns
    const row = Math.floor(i / columns)
    const x = col * frameWidth
    const y = row * frameHeight

    // Форматируем время
    const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = seconds % 60
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`
    }

    lines.push(`${formatTime(startTime)} --> ${formatTime(endTime)}`)
    lines.push(`${spriteFileName}#xywh=${x},${y},${frameWidth},${frameHeight}`)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Генерирует sprite sheet для hover preview на таймлайне
 *
 * Использует FFmpeg tile filter для создания одного изображения с сеткой кадров.
 * Плеер читает VTT файл и показывает соответствующую область спрайта при ховере.
 *
 * @param inputPath - Путь к видеофайлу
 * @param outputDir - Папка для сохранения
 * @param duration - Длительность видео в секундах
 * @param options - Опции генерации
 */
export async function generateThumbnailSprite(
  inputPath: string,
  outputDir: string,
  duration: number,
  options: SpriteSheetOptions = {},
): Promise<SpriteSheetResult> {
  const { frameCount = 100, frameWidth = 160, frameHeight = 90, columns = 10, quality = 75 } = options

  // Создаём папку thumbnails если не существует
  const thumbnailsDir = join(outputDir, 'thumbnails')
  if (!existsSync(thumbnailsDir)) {
    mkdirSync(thumbnailsDir, { recursive: true })
  }

  const spritePath = join(thumbnailsDir, 'sprite.jpg')
  const vttPath = join(thumbnailsDir, 'sprite.vtt')

  // Вычисляем fps для извлечения нужного количества кадров
  // fps = frameCount / duration
  const fps = frameCount / duration

  // Вычисляем размер сетки
  const rows = Math.ceil(frameCount / columns)

  // FFmpeg команда для генерации sprite sheet
  // select='not(mod(n,interval))' — выбирает каждый N-й кадр
  // scale — масштабирует до нужного размера
  // tile — собирает в сетку
  const args: string[] = [
    '-y',
    '-i',
    inputPath,
    '-vf',
    [
      `fps=${fps}`, // Извлекаем frameCount кадров за всю длительность
      `scale=${frameWidth}:${frameHeight}`, // Масштабируем до нужного размера
      `tile=${columns}x${rows}`, // Собираем в сетку
    ].join(','),
    '-frames:v',
    '1', // Один выходной кадр (весь sprite)
    '-q:v',
    Math.round((100 - quality) / 3.33).toString(), // JPEG quality
    spritePath,
  ]

  return new Promise((resolve, reject) => {
    const ff = spawnFFmpeg(args)

    let stderr = ''
    ff.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ff.on('close', async (code) => {
      if (code !== 0) {
        return reject(new Error(`FFmpeg sprite generation failed: ${stderr.slice(-500)}`))
      }

      // Генерируем VTT файл
      const vttContent = generateSpriteVTT('sprite.jpg', duration, frameCount, frameWidth, frameHeight, columns)

      // Записываем VTT
      const { writeFile } = await import('fs/promises')
      await writeFile(vttPath, vttContent, 'utf-8')

      // Получаем размер sprite
      const spriteSize = getScreenshotSize(spritePath)

      resolve({
        spritePath,
        vttPath,
        spriteSize,
      })
    })

    ff.on('error', reject)
  })
}

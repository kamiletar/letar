/**
 * Модуль мержа — сборка финального MKV файла
 */

import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { spawnFFmpeg } from '../utils/ffmpeg-spawn'
import type { MergeChapter, MergeConfig, TranscodeProgress } from './types'

/**
 * Генерирует FFMETADATA файл для глав MKV
 * Формат: https://ffmpeg.org/ffmpeg-formats.html#Metadata-1
 */
async function createChaptersMetadataFile(chapters: MergeChapter[]): Promise<string> {
  const lines = [';FFMETADATA1']

  for (const chapter of chapters) {
    lines.push('')
    lines.push('[CHAPTER]')
    lines.push('TIMEBASE=1/1000')
    lines.push(`START=${chapter.startMs}`)
    lines.push(`END=${chapter.endMs}`)
    lines.push(`title=${chapter.title}`)
  }

  const tempPath = path.join(os.tmpdir(), `chapters-${Date.now()}.txt`)
  await fs.writeFile(tempPath, lines.join('\n'), 'utf-8')

  return tempPath
}

/**
 * Определяет MIME-тип изображения по расширению
 */
function getImageMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    default:
      return 'image/jpeg'
  }
}

/**
 * Мерж видео, аудио и субтитров в MKV контейнер
 *
 * Порядок дорожек:
 * 1. Видео (перекодированное)
 * 2. Оригинальные аудиодорожки
 * 3. Внешние аудиодорожки
 * 4. Субтитры
 *
 * @param config Конфигурация мержа
 * @param onProgress Callback для прогресса
 */
export async function mergeMKV(config: MergeConfig, onProgress?: (progress: TranscodeProgress) => void): Promise<void> {
  const args = ['-y']

  // Временный файл для глав (если есть)
  let chaptersMetadataPath: string | null = null
  if (config.chapters && config.chapters.length > 0) {
    chaptersMetadataPath = await createChaptersMetadataFile(config.chapters)
  }

  // -------------------------------------------------------------------------
  // 1. Входы (inputs)
  // -------------------------------------------------------------------------

  // #0 — перекодированное видео
  args.push('-i', config.videoPath)

  // Индекс для метаданных глав (если есть)
  let chaptersInputIdx: number | null = null
  if (chaptersMetadataPath) {
    chaptersInputIdx = 1
    args.push('-i', chaptersMetadataPath)
  }

  // Динамический индекс следующего входа
  let nextInputIdx = chaptersMetadataPath ? 2 : 1

  // Оригинальный видеоконтейнер с аудио (если есть)
  const hasOriginal = config.originalAudio.length > 0
  const originalAudioInputIdx = nextInputIdx
  if (hasOriginal) {
    args.push('-i', config.originalAudio[0].input)
    nextInputIdx++
  }

  // Внешние аудио
  const externalAudioStartIdx = nextInputIdx
  for (const audio of config.externalAudio) {
    args.push('-i', audio.path)
    nextInputIdx++
  }

  // Субтитры
  const subtitlesStartIdx = nextInputIdx
  for (const sub of config.subtitles) {
    args.push('-i', sub.path)
    nextInputIdx++
  }

  // -------------------------------------------------------------------------
  // 2. Маппинг потоков
  // -------------------------------------------------------------------------

  // Видео — всегда из входа #0
  args.push('-map', '0:v')

  // Главы из метаданных (если есть)
  if (chaptersInputIdx !== null) {
    args.push('-map_chapters', String(chaptersInputIdx))
  }

  // Оригинальные аудиодорожки
  if (hasOriginal) {
    for (let i = 0; i < config.originalAudio.length; i++) {
      args.push('-map', `${originalAudioInputIdx}:a:${i}`)
    }
  }

  // Внешние аудиодорожки
  for (let i = 0; i < config.externalAudio.length; i++) {
    args.push('-map', `${externalAudioStartIdx + i}:a:0`)
  }

  // Субтитры
  for (let i = 0; i < config.subtitles.length; i++) {
    args.push('-map', `${subtitlesStartIdx + i}:s:0`)
  }

  // -------------------------------------------------------------------------
  // 3. Копирование кодеков
  // -------------------------------------------------------------------------

  args.push('-c:v', 'copy')
  args.push('-c:a', 'copy')
  args.push('-c:s', 'ass')

  // -------------------------------------------------------------------------
  // 4. Метаданные для аудио
  // -------------------------------------------------------------------------

  // Оригинальные аудиодорожки
  config.originalAudio.forEach((track, i) => {
    args.push(`-metadata:s:a:${i}`, `language=${track.language}`)
    args.push(`-metadata:s:a:${i}`, `title=${track.title}`)
  })

  // Внешние аудиодорожки
  config.externalAudio.forEach((audio, i) => {
    const idx = config.originalAudio.length + i
    args.push(`-metadata:s:a:${idx}`, `language=${audio.language}`)
    args.push(`-metadata:s:a:${idx}`, `title=${audio.title}`)
  })

  // -------------------------------------------------------------------------
  // 5. Субтитры и прикрепление шрифтов
  // -------------------------------------------------------------------------

  let fontAttachIndex = 0

  config.subtitles.forEach((sub, i) => {
    args.push(`-metadata:s:s:${i}`, `language=${sub.language}`)
    args.push(`-metadata:s:s:${i}`, `title=${sub.title}`)

    // Прикрепляем шрифты
    for (const font of sub.fonts) {
      args.push('-attach', font)

      const mimetype = font.toLowerCase().endsWith('.otf')
        ? 'application/vnd.ms-opentype'
        : 'application/x-truetype-font'

      args.push(`-metadata:s:t:${fontAttachIndex}`, `mimetype=${mimetype}`)
      fontAttachIndex++
    }
  })

  // -------------------------------------------------------------------------
  // 5.5. Default track disposition
  // -------------------------------------------------------------------------

  const totalAudio = config.originalAudio.length + config.externalAudio.length

  // Устанавливаем disposition для аудио: default для одной дорожки, none для остальных
  for (let i = 0; i < totalAudio; i++) {
    const isDefault = config.defaultAudioIndex === i
    args.push(`-disposition:a:${i}`, isDefault ? 'default' : '0')
  }

  // Устанавливаем disposition для субтитров: default для одной дорожки, none для остальных
  for (let i = 0; i < config.subtitles.length; i++) {
    const isDefault = config.defaultSubtitleIndex === i
    args.push(`-disposition:s:${i}`, isDefault ? 'default' : '0')
  }

  // -------------------------------------------------------------------------
  // 6. Постер / Обложка
  // -------------------------------------------------------------------------

  if (config.posterPath) {
    args.push('-attach', config.posterPath)
    args.push(`-metadata:s:t:${fontAttachIndex}`, `mimetype=${getImageMimeType(config.posterPath)}`)
    args.push(`-metadata:s:t:${fontAttachIndex}`, 'filename=cover')
    // fontAttachIndex++ — не нужно, т.к. это последний attach
  }

  // -------------------------------------------------------------------------
  // 7. Вывод
  // -------------------------------------------------------------------------

  args.push(config.outputPath)

  // -------------------------------------------------------------------------
  // 8. Запуск FFmpeg
  // -------------------------------------------------------------------------

  // Функция очистки временных файлов
  const cleanup = async () => {
    if (chaptersMetadataPath) {
      try {
        await fs.unlink(chaptersMetadataPath)
      } catch {
        // Игнорируем ошибки удаления временных файлов
      }
    }
  }

  return new Promise((resolve, reject) => {
    const ff = spawnFFmpeg(args)

    ff.stderr.on('data', () => {
      // Мерж обычно очень быстрый, прогресс не особо нужен
      // Но можно добавить если нужно
    })

    ff.on('close', async (code) => {
      await cleanup()

      if (code === 0) {
        if (onProgress) {
          onProgress({
            percent: 100,
            currentTime: 0,
            totalDuration: 0,
            eta: 0,
            stage: 'merge',
          })
        }
        resolve()
      } else {
        reject(new Error(`ffmpeg merge exited with code ${code}`))
      }
    })

    ff.on('error', async (err) => {
      await cleanup()
      reject(err)
    })
  })
}

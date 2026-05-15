/**
 * Модуль мержа — сборка финального MKV файла
 */

import { spawnFFmpeg } from '../../utils/ffmpeg-spawn'
import type { MergeConfig, TranscodeProgress } from './types'

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

  // -------------------------------------------------------------------------
  // 1. Входы (inputs)
  // -------------------------------------------------------------------------

  // #0 — перекодированное видео
  args.push('-i', config.videoPath)

  // #1 — оригинальный видеоконтейнер с аудио (если есть)
  const hasOriginal = config.originalAudio.length > 0
  if (hasOriginal) {
    args.push('-i', config.originalAudio[0].input)
  }

  // #2+ — внешние аудио
  for (const audio of config.externalAudio) {
    args.push('-i', audio.path)
  }

  // Далее идут субтитры
  for (const sub of config.subtitles) {
    args.push('-i', sub.path)
  }

  // -------------------------------------------------------------------------
  // 2. Маппинг потоков
  // -------------------------------------------------------------------------

  // Видео — всегда из входа #0
  args.push('-map', '0:v')

  let nextInputIdx = 1

  // Оригинальные аудиодорожки
  if (hasOriginal) {
    for (let i = 0; i < config.originalAudio.length; i++) {
      args.push('-map', `1:a:${i}`)
    }
    nextInputIdx++
  }

  // Внешние аудиодорожки
  for (let i = 0; i < config.externalAudio.length; i++) {
    args.push('-map', `${nextInputIdx + i}:a:0`)
  }
  nextInputIdx += config.externalAudio.length

  // Субтитры
  for (let i = 0; i < config.subtitles.length; i++) {
    args.push('-map', `${nextInputIdx + i}:s:0`)
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
  // 6. Вывод
  // -------------------------------------------------------------------------

  args.push(config.outputPath)

  // -------------------------------------------------------------------------
  // 7. Запуск FFmpeg
  // -------------------------------------------------------------------------

  return new Promise((resolve, reject) => {
    const ff = spawnFFmpeg(args)

    ff.stderr.on('data', () => {
      // Мерж обычно очень быстрый, прогресс не особо нужен
      // Но можно добавить если нужно
    })

    ff.on('close', (code) => {
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

    ff.on('error', reject)
  })
}

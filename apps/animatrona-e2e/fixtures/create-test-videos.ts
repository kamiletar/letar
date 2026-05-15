/**
 * Скрипт для генерации тестовых видеофайлов.
 *
 * Создаёт минимальные видео для E2E тестов:
 * - sample-1s.mkv — 1 сек, для быстрых smoke тестов
 * - sample-5s.mkv — 5 сек, стандартное тестовое видео
 * - sample-audio.mkv — 5 сек с 3 аудиодорожками
 * - sample-subs.mkv — 5 сек с ASS субтитрами
 *
 * Запуск: nx fixtures:create animatrona-e2e
 */

import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// Пути
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..')
const FFMPEG_PATH = path.join(WORKSPACE_ROOT, 'apps/animatrona/resources/ffmpeg/win/ffmpeg.exe')
const OUTPUT_DIR = path.join(__dirname, 'videos')
const ANIME_FOLDER_DIR = path.join(__dirname, 'anime-folder')
const SAMPLE_ASS = path.join(__dirname, 'sample.ass')

/**
 * Проверить наличие FFmpeg
 */
function checkFFmpeg(): void {
  if (!fs.existsSync(FFMPEG_PATH)) {
    console.error(`FFmpeg not found at: ${FFMPEG_PATH}`)
    console.error('Make sure FFmpeg binaries are in apps/animatrona/resources/ffmpeg/win/')
    process.exit(1)
  }
}

/**
 * Запустить FFmpeg с аргументами
 */
function runFFmpeg(args: string[], description: string): void {
  console.log(`Creating: ${description}...`)

  try {
    execFileSync(FFMPEG_PATH, args, {
      stdio: 'pipe',
      timeout: 60000, // 1 минута таймаут
    })
    console.log(`  ✓ Done`)
  } catch (error) {
    console.error(`  ✗ Failed: ${(error as Error).message}`)
    throw error
  }
}

/**
 * Создать простое тестовое видео
 */
function createSimpleVideo(filename: string, duration: number): void {
  const output = path.join(OUTPUT_DIR, filename)

  // Пропускаем если уже существует
  if (fs.existsSync(output)) {
    console.log(`Skipping ${filename} (already exists)`)
    return
  }

  const args = [
    '-y', // Перезаписывать
    '-f',
    'lavfi',
    '-i',
    `testsrc=duration=${duration}:size=1920x1080:rate=24`,
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=440:duration=${duration}`,
    '-c:v',
    'libx264', // x264 быстрее чем x265 для тестов
    '-preset',
    'ultrafast',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-shortest',
    output,
  ]

  runFFmpeg(args, `${filename} (${duration}s video)`)
}

/**
 * Создать видео с несколькими аудиодорожками
 */
function createMultiAudioVideo(): void {
  const output = path.join(OUTPUT_DIR, 'sample-audio.mkv')

  if (fs.existsSync(output)) {
    console.log('Skipping sample-audio.mkv (already exists)')
    return
  }

  const duration = 5

  const args = [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `testsrc=duration=${duration}:size=1920x1080:rate=24`,
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=440:duration=${duration}`, // Track 1: 440 Hz
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=550:duration=${duration}`, // Track 2: 550 Hz
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=660:duration=${duration}`, // Track 3: 660 Hz
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-map',
    '0:v',
    '-map',
    '1:a',
    '-map',
    '2:a',
    '-map',
    '3:a',
    // Метаданные для аудиодорожек
    '-metadata:s:a:0',
    'language=jpn',
    '-metadata:s:a:0',
    'title=Japanese',
    '-metadata:s:a:1',
    'language=rus',
    '-metadata:s:a:1',
    'title=Russian Dub',
    '-metadata:s:a:2',
    'language=eng',
    '-metadata:s:a:2',
    'title=English Dub',
    output,
  ]

  runFFmpeg(args, 'sample-audio.mkv (3 audio tracks)')
}

/**
 * Создать видео с субтитрами
 */
function createSubtitledVideo(): void {
  const output = path.join(OUTPUT_DIR, 'sample-subs.mkv')

  if (fs.existsSync(output)) {
    console.log('Skipping sample-subs.mkv (already exists)')
    return
  }

  if (!fs.existsSync(SAMPLE_ASS)) {
    console.error(`sample.ass not found at: ${SAMPLE_ASS}`)
    return
  }

  const duration = 5

  const args = [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `testsrc=duration=${duration}:size=1920x1080:rate=24`,
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=440:duration=${duration}`,
    '-i',
    SAMPLE_ASS,
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-c:s',
    'ass',
    '-map',
    '0:v',
    '-map',
    '1:a',
    '-map',
    '2:s',
    '-metadata:s:s:0',
    'language=rus',
    '-metadata:s:s:0',
    'title=Russian',
    output,
  ]

  runFFmpeg(args, 'sample-subs.mkv (with ASS subtitles)')
}

/**
 * Создать папку anime-folder с файлами для import тестов.
 *
 * Генерирует файлы с именами, которые парсит Animatrona:
 * - [TestSub] Test Anime - 01.mkv
 * - [TestSub] Test Anime - 02.mkv
 * - [TestSub] Test Anime - 03.mkv
 */
function createAnimeFolderFixtures(): void {
  console.log('\n--- Creating anime-folder fixtures ---')

  if (!fs.existsSync(ANIME_FOLDER_DIR)) {
    fs.mkdirSync(ANIME_FOLDER_DIR, { recursive: true })
  }

  // Имена файлов в стиле аниме-релизов
  const episodes = ['[TestSub] Test Anime - 01.mkv', '[TestSub] Test Anime - 02.mkv', '[TestSub] Test Anime - 03.mkv']

  const duration = 1 // 1 секунда для быстрых тестов

  for (const filename of episodes) {
    const output = path.join(ANIME_FOLDER_DIR, filename)

    if (fs.existsSync(output)) {
      console.log(`Skipping ${filename} (already exists)`)
      continue
    }

    const args = [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `testsrc=duration=${duration}:size=1280x720:rate=24`,
      '-f',
      'lavfi',
      '-i',
      `sine=frequency=440:duration=${duration}`,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-shortest',
      output,
    ]

    runFFmpeg(args, filename)
  }

  console.log('--- anime-folder fixtures created ---')
}

/**
 * Главная функция
 */
function main(): void {
  console.log('=== Creating test video fixtures ===\n')

  // Проверяем FFmpeg
  checkFFmpeg()

  // Создаём директорию
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // Создаём видео
  createSimpleVideo('sample-1s.mkv', 1)
  createSimpleVideo('sample-5s.mkv', 5)
  createMultiAudioVideo()
  createSubtitledVideo()

  // Создаём anime-folder для import тестов
  createAnimeFolderFixtures()

  console.log('\n=== All fixtures created! ===')

  // Показываем созданные файлы
  const showDir = (dir: string, name: string) => {
    if (!fs.existsSync(dir)) {
      return
    }
    const files = fs.readdirSync(dir)
    console.log(`\n${name}:`)
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stats = fs.statSync(filePath)
      const sizeKB = Math.round(stats.size / 1024)
      console.log(`  - ${file} (${sizeKB} KB)`)
    }
  }

  showDir(OUTPUT_DIR, 'videos/')
  showDir(ANIME_FOLDER_DIR, 'anime-folder/')
}

main()

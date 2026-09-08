/**
 * Скрипт для генерации тестовой папки с "сериалом" для E2E тестов Animatrona Player.
 *
 * Использует ffmpeg из `apps/animatrona/resources/ffmpeg/win/` (bundled-бинарь desktop-версии
 * Animatrona) — только как build-time инструмент генерации фикстур, сама Animatrona Player его
 * не тащит и в рантайме не использует (см. `apps/animatrona-folder-player/PLAN.md`,
 * "Без ffmpeg").
 *
 * Запуск: nx fixtures:create animatrona-folder-player-e2e
 */

import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..')
const FFMPEG_PATH = path.join(WORKSPACE_ROOT, 'apps/animatrona/resources/ffmpeg/win/ffmpeg.exe')
const ANIME_FOLDER_DIR = path.join(__dirname, 'anime-folder')

function checkFFmpeg(): void {
  if (!fs.existsSync(FFMPEG_PATH)) {
    console.error(`FFmpeg not found at: ${FFMPEG_PATH}`)
    console.error('Make sure FFmpeg binaries are in apps/animatrona/resources/ffmpeg/win/')
    process.exit(1)
  }
}

function runFFmpeg(args: string[], description: string): void {
  console.log(`Creating: ${description}...`)

  try {
    execFileSync(FFMPEG_PATH, args, {
      stdio: 'pipe',
      timeout: 60000,
    })
    console.log(`  ✓ Done`)
  } catch (error) {
    console.error(`  ✗ Failed: ${(error as Error).message}`)
    throw error
  }
}

/**
 * Создать папку anime-folder с 3 эпизодами.
 *
 * Имена в стиле реальных релизов — parse-filename.ts (`@letar/folder-player-react`) должен
 * извлечь номер серии из `- 01`/`- 02`/`- 03`.
 */
function createAnimeFolderFixtures(): void {
  console.log('\n--- Creating anime-folder fixtures ---')

  if (!fs.existsSync(ANIME_FOLDER_DIR)) {
    fs.mkdirSync(ANIME_FOLDER_DIR, { recursive: true })
  }

  const episodes = ['[TestSub] Test Anime - 01.mkv', '[TestSub] Test Anime - 02.mkv', '[TestSub] Test Anime - 03.mkv']

  const duration = 2 // короткие ролики — быстрые тесты, но достаточно для проверки старта плеера

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

function main(): void {
  console.log('=== Creating test fixtures for animatrona-folder-player-e2e ===\n')

  checkFFmpeg()
  createAnimeFolderFixtures()

  console.log('\n=== All fixtures created! ===')

  if (fs.existsSync(ANIME_FOLDER_DIR)) {
    const files = fs.readdirSync(ANIME_FOLDER_DIR)
    console.log('\nanime-folder/:')
    for (const file of files) {
      const filePath = path.join(ANIME_FOLDER_DIR, file)
      const stats = fs.statSync(filePath)
      const sizeKB = Math.round(stats.size / 1024)
      console.log(`  - ${file} (${sizeKB} KB)`)
    }
  }
}

main()

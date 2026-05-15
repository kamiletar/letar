/**
 * Скрипт для скачивания FFmpeg перед сборкой
 *
 * Запускается перед electron-builder:
 * bunx tsx scripts/download-ffmpeg.ts [--platform <win|linux|all>]
 *
 * Скачивает сборку BtbN с libsvtav1 в resources/ffmpeg/
 *
 * Поддерживаемые платформы:
 * - Windows: BtbN builds (zip) → resources/ffmpeg/win/
 * - Linux: BtbN builds (tar.xz) → resources/ffmpeg/linux/
 * - macOS: требуется установка через Homebrew (не скачивается)
 *
 * Примеры:
 *   npx tsx scripts/download-ffmpeg.ts           # Текущая платформа
 *   npx tsx scripts/download-ffmpeg.ts --platform win
 *   npx tsx scripts/download-ffmpeg.ts --platform linux
 *   npx tsx scripts/download-ffmpeg.ts --platform all   # Для release:all
 */

import { exec } from 'child_process'
import * as fs from 'fs'
import * as https from 'https'
import * as path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

type Platform = 'win' | 'linux' | 'mac'

interface DownloadInfo {
  platform: Platform
  url: string
  ext: string
  binaries: string[]
  folder: string
}

/** Конфигурация для каждой платформы */
const PLATFORM_CONFIGS: Record<Platform, DownloadInfo | null> = {
  win: {
    platform: 'win',
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    ext: 'zip',
    binaries: ['ffmpeg.exe', 'ffprobe.exe'],
    folder: 'win',
  },
  linux: {
    platform: 'linux',
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    ext: 'tar.xz',
    binaries: ['ffmpeg', 'ffprobe'],
    folder: 'linux',
  },
  mac: null, // BtbN не предоставляет сборки для macOS
}

/** Получить целевые платформы из аргументов */
function getTargetPlatforms(): Platform[] {
  const args = process.argv.slice(2)
  const platformIdx = args.indexOf('--platform')

  if (platformIdx !== -1 && args[platformIdx + 1]) {
    const target = args[platformIdx + 1].toLowerCase()

    if (target === 'all') {
      return ['win', 'linux'] // mac пропускаем — нет сборок
    }

    if (target === 'win' || target === 'windows') {
      return ['win']
    }

    if (target === 'linux') {
      return ['linux']
    }

    if (target === 'mac' || target === 'darwin' || target === 'macos') {
      return ['mac']
    }

    console.error(`❌ Неизвестная платформа: ${target}`)
    console.error('   Доступные: win, linux, mac, all')
    process.exit(1)
  }

  // Автоопределение текущей платформы
  if (process.platform === 'win32') return ['win']
  if (process.platform === 'linux') return ['linux']
  if (process.platform === 'darwin') return ['mac']

  return []
}

/** Базовая папка для FFmpeg */
const FFMPEG_BASE_DIR = path.join(__dirname, '..', 'resources', 'ffmpeg')

/** Временный файл */
function getTempFile(ext: string): string {
  return path.join(__dirname, '..', 'resources', `ffmpeg-download.${ext}`)
}

async function main() {
  console.log('📦 Скачивание FFmpeg с SVT-AV1...')

  const targetPlatforms = getTargetPlatforms()
  console.log(`   Целевые платформы: ${targetPlatforms.join(', ')}`)

  if (targetPlatforms.length === 0) {
    console.error('❌ Не удалось определить платформу')
    process.exit(1)
  }

  // Создаём базовую папку resources/ffmpeg если нет
  if (!fs.existsSync(FFMPEG_BASE_DIR)) {
    fs.mkdirSync(FFMPEG_BASE_DIR, { recursive: true })
  }

  for (const platform of targetPlatforms) {
    console.log(`\n── ${platform.toUpperCase()} ──`)

    const config = PLATFORM_CONFIGS[platform]

    // macOS не поддерживается через BtbN
    if (!config) {
      console.log('⚠️ macOS: BtbN не предоставляет сборки')
      console.log('   Установите FFmpeg через Homebrew:')
      console.log('   brew install ffmpeg')
      continue
    }

    const platformDir = path.join(FFMPEG_BASE_DIR, config.folder)
    const ffmpegBin = path.join(platformDir, config.binaries[0])

    // Проверяем не скачан ли уже
    if (fs.existsSync(ffmpegBin)) {
      console.log('✅ Уже скачан:', ffmpegBin)

      // Проверяем libsvtav1 только для текущей платформы
      if (
        (platform === 'win' && process.platform === 'win32') ||
        (platform === 'linux' && process.platform === 'linux')
      ) {
        try {
          const { stdout } = await execAsync(`"${ffmpegBin}" -encoders 2>&1`)
          if (stdout.includes('libsvtav1')) {
            console.log('✅ libsvtav1 поддерживается')
            continue
          } else {
            console.log('⚠️ libsvtav1 не найден, перескачиваем...')
          }
        } catch {
          console.log('⚠️ Не удалось проверить FFmpeg, перескачиваем...')
        }
      } else {
        // Кросс-платформенная сборка — не можем проверить бинарник
        continue
      }
    }

    const tempFile = getTempFile(config.ext)

    // Скачиваем
    console.log('⬇️ Скачивание:', config.url)
    await downloadFile(config.url, tempFile)
    console.log('✅ Скачано:', tempFile)

    // Распаковываем во временную папку
    console.log('📂 Распаковка...')
    const extractDir = path.join(FFMPEG_BASE_DIR, `_extract_${platform}`)

    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true })
    }
    fs.mkdirSync(extractDir, { recursive: true })

    // Распаковываем в зависимости от формата
    if (config.ext === 'zip') {
      // Windows: PowerShell Expand-Archive
      await execAsync(
        `powershell -Command "Expand-Archive -Path '${tempFile}' -DestinationPath '${extractDir}' -Force"`
      )
    } else if (config.ext === 'tar.xz') {
      // tar.xz: используем tar (доступен на Linux и Windows 10+)
      // На Windows cmd.exe может не видеть tar, используем полный путь
      const isWindows = process.platform === 'win32'
      if (isWindows) {
        // Windows: tar доступен в System32 начиная с Windows 10 1803
        const winTar = 'C:\\Windows\\System32\\tar.exe'
        if (fs.existsSync(winTar)) {
          await execAsync(`"${winTar}" -xf "${tempFile}" -C "${extractDir}"`)
        } else {
          // Fallback: tar из Git for Windows
          const gitTar = 'C:\\Program Files\\Git\\usr\\bin\\tar.exe'
          if (fs.existsSync(gitTar)) {
            await execAsync(`"${gitTar}" -xf "${tempFile}" -C "${extractDir}"`)
          } else {
            throw new Error('tar не найден. Установите Git for Windows или обновите Windows до 10 1803+')
          }
        }
      } else {
        // Linux/macOS: tar встроен
        await execAsync(`tar -xf "${tempFile}" -C "${extractDir}"`)
      }
    }

    // Находим вложенную папку ffmpeg-xxx и извлекаем bin/
    const entries = fs.readdirSync(extractDir)
    const innerDir = entries.find((e) => e.startsWith('ffmpeg-') && fs.statSync(path.join(extractDir, e)).isDirectory())

    // Создаём папку платформы
    if (fs.existsSync(platformDir)) {
      fs.rmSync(platformDir, { recursive: true })
    }
    fs.mkdirSync(platformDir, { recursive: true })

    if (innerDir) {
      const binSrc = path.join(extractDir, innerDir, 'bin')

      if (fs.existsSync(binSrc)) {
        // Копируем только бинарники
        for (const binary of config.binaries) {
          const src = path.join(binSrc, binary)
          const dst = path.join(platformDir, binary)
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dst)
          }
        }
      }
    }

    // Удаляем временные файлы
    fs.rmSync(extractDir, { recursive: true })
    fs.unlinkSync(tempFile)

    // Проверяем результат
    if (fs.existsSync(ffmpegBin)) {
      console.log('✅ FFmpeg установлен:', platformDir)

      // Проверяем версию только для текущей платформы
      if (
        (platform === 'win' && process.platform === 'win32') ||
        (platform === 'linux' && process.platform === 'linux')
      ) {
        try {
          const { stdout } = await execAsync(`"${ffmpegBin}" -version`)
          console.log('   ' + stdout.split('\n')[0])

          const { stdout: encoders } = await execAsync(`"${ffmpegBin}" -encoders 2>&1`)
          if (encoders.includes('libsvtav1')) {
            console.log('✅ libsvtav1 поддерживается!')
          }
        } catch {
          // Игнорируем ошибки проверки
        }
      }
    } else {
      console.error(`❌ Ошибка: ${config.binaries[0]} не найден после распаковки`)
      process.exit(1)
    }
  }

  console.log('\n✅ Готово!')
}

/** Скачать файл с поддержкой редиректов */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const followRedirects = (currentUrl: string, redirectCount = 0) => {
      if (redirectCount > 10) {
        return reject(new Error('Too many redirects'))
      }

      const protocol = currentUrl.startsWith('https') ? https : require('http')

      protocol
        .get(currentUrl, (response: any) => {
          // Редирект
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            return followRedirects(response.headers.location, redirectCount + 1)
          }

          if (response.statusCode !== 200) {
            return reject(new Error(`HTTP ${response.statusCode}`))
          }

          const totalSize = parseInt(response.headers['content-length'] || '0', 10)
          let downloadedSize = 0
          let lastPercent = 0

          const file = fs.createWriteStream(destPath)

          response.on('data', (chunk: Buffer) => {
            downloadedSize += chunk.length
            if (totalSize > 0) {
              const percent = Math.round((downloadedSize / totalSize) * 100)
              if (percent >= lastPercent + 10) {
                process.stdout.write(`\r   ${percent}% (${Math.round(downloadedSize / 1024 / 1024)}MB)`)
                lastPercent = percent
              }
            }
          })

          response.pipe(file)

          file.on('finish', () => {
            file.close()
            console.log('')
            resolve()
          })

          file.on('error', (err) => {
            fs.unlinkSync(destPath)
            reject(err)
          })
        })
        .on('error', reject)
    }

    followRedirects(url)
  })
}

main().catch((err) => {
  console.error('❌ Ошибка:', err)
  process.exit(1)
})

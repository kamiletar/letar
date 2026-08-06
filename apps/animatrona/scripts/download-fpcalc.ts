/**
 * Скрипт для скачивания fpcalc (Chromaprint) для определения OP/ED
 *
 * Запускается:
 *   npx tsx scripts/download-fpcalc.ts
 *   npx tsx scripts/download-fpcalc.ts --platform win
 *   npx tsx scripts/download-fpcalc.ts --platform all
 *
 * Скачивает официальные релизы Chromaprint в resources/fpcalc/
 *
 * Результат:
 * - Windows: resources/fpcalc/win/fpcalc.exe
 * - Linux:   resources/fpcalc/linux/fpcalc
 */

import { exec } from 'child_process'
import * as fs from 'fs'
import * as https from 'https'
import * as path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Версия Chromaprint для скачивания
const CHROMAPRINT_VERSION = '1.5.1'

type Platform = 'win' | 'linux'

interface DownloadInfo {
  platform: Platform
  url: string
  ext: string
  binary: string
  folder: string
}

/** Конфигурация для каждой платформы */
function getPlatformConfig(platform: Platform): DownloadInfo {
  const baseUrl = `https://github.com/acoustid/chromaprint/releases/download/v${CHROMAPRINT_VERSION}`

  const configs: Record<Platform, DownloadInfo> = {
    win: {
      platform: 'win',
      url: `${baseUrl}/chromaprint-fpcalc-${CHROMAPRINT_VERSION}-windows-x86_64.zip`,
      ext: 'zip',
      binary: 'fpcalc.exe',
      folder: 'win',
    },
    linux: {
      platform: 'linux',
      url: `${baseUrl}/chromaprint-fpcalc-${CHROMAPRINT_VERSION}-linux-x86_64.tar.gz`,
      ext: 'tar.gz',
      binary: 'fpcalc',
      folder: 'linux',
    },
  }

  return configs[platform]
}

/** Получить целевые платформы из аргументов */
function getTargetPlatforms(): Platform[] {
  const args = process.argv.slice(2)
  const platformIdx = args.indexOf('--platform')

  if (platformIdx !== -1 && args[platformIdx + 1]) {
    const target = args[platformIdx + 1].toLowerCase()

    if (target === 'all') {
      return ['win', 'linux']
    }

    if (target === 'win' || target === 'windows') {
      return ['win']
    }

    if (target === 'linux') {
      return ['linux']
    }

    console.error(`Неизвестная платформа: ${target}`)
    console.error('   Доступные: win, linux, all')
    process.exit(1)
  }

  // Автоопределение текущей платформы
  if (process.platform === 'win32') return ['win']
  if (process.platform === 'linux') return ['linux']

  console.error('macOS не поддерживается (нет официальных сборок fpcalc)')
  return []
}

/** Базовая папка для fpcalc */
const FPCALC_BASE_DIR = path.join(__dirname, '..', 'resources', 'fpcalc')

async function main() {
  console.log(`Скачивание fpcalc (Chromaprint) v${CHROMAPRINT_VERSION}...`)

  const targetPlatforms = getTargetPlatforms()
  console.log(`   Целевые платформы: ${targetPlatforms.join(', ')}`)

  if (targetPlatforms.length === 0) {
    console.error('Не удалось определить платформу')
    process.exit(1)
  }

  // Создаём базовую папку
  if (!fs.existsSync(FPCALC_BASE_DIR)) {
    fs.mkdirSync(FPCALC_BASE_DIR, { recursive: true })
  }

  for (const platform of targetPlatforms) {
    console.log(`\n-- ${platform.toUpperCase()} --`)

    const config = getPlatformConfig(platform)
    const platformDir = path.join(FPCALC_BASE_DIR, config.folder)
    const fpcalcBin = path.join(platformDir, config.binary)

    // Проверяем не скачан ли уже
    if (fs.existsSync(fpcalcBin)) {
      console.log('Уже скачан:', fpcalcBin)
      continue
    }

    const tempFile = path.join(FPCALC_BASE_DIR, `fpcalc-${platform}.${config.ext}`)

    // Скачиваем
    console.log('Скачивание:', config.url)
    await downloadFile(config.url, tempFile)
    console.log('Скачано:', tempFile)

    // Распаковываем
    console.log('Распаковка...')
    const extractDir = path.join(FPCALC_BASE_DIR, `_extract_${platform}`)

    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true })
    }
    fs.mkdirSync(extractDir, { recursive: true })

    if (config.ext === 'zip') {
      await execAsync(
        `powershell -Command "Expand-Archive -Path '${tempFile}' -DestinationPath '${extractDir}' -Force"`,
      )
    } else if (config.ext === 'tar.gz') {
      const isWindows = process.platform === 'win32'
      if (isWindows) {
        const winTar = 'C:\\Windows\\System32\\tar.exe'
        await execAsync(`"${winTar}" -xzf "${tempFile}" -C "${extractDir}"`)
      } else {
        await execAsync(`tar -xzf "${tempFile}" -C "${extractDir}"`)
      }
    }

    // Chromaprint архивы: chromaprint-fpcalc-1.5.1-windows-x86_64/fpcalc.exe
    // Ищем fpcalc рекурсивно
    const fpcalcPath = findFile(extractDir, config.binary)
    if (!fpcalcPath) {
      throw new Error(`fpcalc не найден в архиве: ${extractDir}`)
    }

    // Создаём папку платформы
    if (fs.existsSync(platformDir)) {
      fs.rmSync(platformDir, { recursive: true })
    }
    fs.mkdirSync(platformDir, { recursive: true })

    // Копируем бинарник
    fs.copyFileSync(fpcalcPath, fpcalcBin)

    // Делаем исполняемым на Unix
    if (platform !== 'win') {
      fs.chmodSync(fpcalcBin, 0o755)
    }

    // Удаляем временные файлы
    fs.rmSync(extractDir, { recursive: true })
    fs.unlinkSync(tempFile)

    if (fs.existsSync(fpcalcBin)) {
      console.log('fpcalc установлен:', fpcalcBin)
    } else {
      console.error(`Ошибка: ${config.binary} не найден после распаковки`)
      process.exit(1)
    }
  }

  console.log('\nГотово!')
}

/** Рекурсивный поиск файла по имени */
function findFile(dir: string, filename: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const found = findFile(fullPath, filename)
      if (found) return found
    } else if (entry.name === filename) {
      return fullPath
    }
  }
  return null
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

          file.on('error', (err: Error) => {
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
  console.error('Ошибка:', err)
  process.exit(1)
})

/**
 * Скрипт для скачивания Kubo (Go IPFS) перед сборкой
 *
 * Запускается перед electron-builder:
 * bunx tsx scripts/download-kubo.ts [--platform <win|linux|darwin|all>]
 *
 * Скачивает официальные релизы Kubo в resources/kubo/
 *
 * Поддерживаемые платформы:
 * - Windows x64: resources/kubo/win/kubo.exe
 * - Linux x64: resources/kubo/linux/kubo
 * - macOS x64: resources/kubo/darwin/kubo
 * - macOS arm64: resources/kubo/darwin-arm64/kubo
 *
 * Примеры:
 *   npx tsx scripts/download-kubo.ts              # Текущая платформа
 *   npx tsx scripts/download-kubo.ts --platform win
 *   npx tsx scripts/download-kubo.ts --platform linux
 *   npx tsx scripts/download-kubo.ts --platform all   # Для release:all
 */

import { exec } from 'child_process'
import * as fs from 'fs'
import * as https from 'https'
import * as path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Версия Kubo для скачивания (должна совпадать с версией в package.json)
const KUBO_VERSION = '0.40.1'

type Platform = 'win' | 'linux' | 'darwin' | 'darwin-arm64'

interface DownloadInfo {
  platform: Platform
  url: string
  ext: string
  binary: string
  folder: string
}

/** Конфигурация для каждой платформы */
function getPlatformConfig(platform: Platform): DownloadInfo {
  const baseUrl = `https://github.com/ipfs/kubo/releases/download/v${KUBO_VERSION}`

  const configs: Record<Platform, DownloadInfo> = {
    win: {
      platform: 'win',
      url: `${baseUrl}/kubo_v${KUBO_VERSION}_windows-amd64.zip`,
      ext: 'zip',
      binary: 'kubo.exe',
      folder: 'win',
    },
    linux: {
      platform: 'linux',
      url: `${baseUrl}/kubo_v${KUBO_VERSION}_linux-amd64.tar.gz`,
      ext: 'tar.gz',
      binary: 'kubo',
      folder: 'linux',
    },
    darwin: {
      platform: 'darwin',
      url: `${baseUrl}/kubo_v${KUBO_VERSION}_darwin-amd64.tar.gz`,
      ext: 'tar.gz',
      binary: 'kubo',
      folder: 'darwin',
    },
    'darwin-arm64': {
      platform: 'darwin-arm64',
      url: `${baseUrl}/kubo_v${KUBO_VERSION}_darwin-arm64.tar.gz`,
      ext: 'tar.gz',
      binary: 'kubo',
      folder: 'darwin-arm64',
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
      return ['win', 'linux', 'darwin', 'darwin-arm64']
    }

    if (target === 'win' || target === 'windows') {
      return ['win']
    }

    if (target === 'linux') {
      return ['linux']
    }

    if (target === 'mac' || target === 'darwin' || target === 'macos') {
      // Для macOS скачиваем обе архитектуры
      return ['darwin', 'darwin-arm64']
    }

    if (target === 'darwin-arm64' || target === 'arm64') {
      return ['darwin-arm64']
    }

    console.error(`❌ Неизвестная платформа: ${target}`)
    console.error('   Доступные: win, linux, darwin, darwin-arm64, all')
    process.exit(1)
  }

  // Автоопределение текущей платформы
  if (process.platform === 'win32') return ['win']
  if (process.platform === 'linux') return ['linux']
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? ['darwin-arm64'] : ['darwin']
  }

  return []
}

/** Базовая папка для Kubo */
const KUBO_BASE_DIR = path.join(__dirname, '..', 'resources', 'kubo')

/** Временный файл */
function getTempFile(platform: Platform, ext: string): string {
  return path.join(__dirname, '..', 'resources', `kubo-${platform}.${ext}`)
}

async function main() {
  console.log(`📦 Скачивание Kubo v${KUBO_VERSION}...`)

  const targetPlatforms = getTargetPlatforms()
  console.log(`   Целевые платформы: ${targetPlatforms.join(', ')}`)

  if (targetPlatforms.length === 0) {
    console.error('❌ Не удалось определить платформу')
    process.exit(1)
  }

  // Создаём базовую папку resources/kubo если нет
  if (!fs.existsSync(KUBO_BASE_DIR)) {
    fs.mkdirSync(KUBO_BASE_DIR, { recursive: true })
  }

  for (const platform of targetPlatforms) {
    console.log(`\n── ${platform.toUpperCase()} ──`)

    const config = getPlatformConfig(platform)
    const platformDir = path.join(KUBO_BASE_DIR, config.folder)
    const kuboBin = path.join(platformDir, config.binary)

    // Проверяем не скачан ли уже
    if (fs.existsSync(kuboBin)) {
      console.log('✅ Уже скачан:', kuboBin)

      // Проверяем версию только для текущей платформы
      if (
        (platform === 'win' && process.platform === 'win32') ||
        (platform === 'linux' && process.platform === 'linux') ||
        (platform === 'darwin' && process.platform === 'darwin' && process.arch !== 'arm64') ||
        (platform === 'darwin-arm64' && process.platform === 'darwin' && process.arch === 'arm64')
      ) {
        try {
          const { stdout } = await execAsync(`"${kuboBin}" version`)
          console.log('   Версия:', stdout.trim())
          continue
        } catch {
          console.log('⚠️ Не удалось проверить версию, перескачиваем...')
        }
      } else {
        // Кросс-платформенная сборка — не можем проверить бинарник
        continue
      }
    }

    const tempFile = getTempFile(platform, config.ext)

    // Скачиваем
    console.log('⬇️ Скачивание:', config.url)
    await downloadFile(config.url, tempFile)
    console.log('✅ Скачано:', tempFile)

    // Распаковываем во временную папку
    console.log('📂 Распаковка...')
    const extractDir = path.join(KUBO_BASE_DIR, `_extract_${platform}`)

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
    } else if (config.ext === 'tar.gz') {
      // tar.gz: используем tar
      const isWindows = process.platform === 'win32'
      if (isWindows) {
        const winTar = 'C:\\Windows\\System32\\tar.exe'
        if (fs.existsSync(winTar)) {
          await execAsync(`"${winTar}" -xzf "${tempFile}" -C "${extractDir}"`)
        } else {
          const gitTar = 'C:\\Program Files\\Git\\usr\\bin\\tar.exe'
          if (fs.existsSync(gitTar)) {
            await execAsync(`"${gitTar}" -xzf "${tempFile}" -C "${extractDir}"`)
          } else {
            throw new Error('tar не найден. Установите Git for Windows или обновите Windows до 10 1803+')
          }
        }
      } else {
        await execAsync(`tar -xzf "${tempFile}" -C "${extractDir}"`)
      }
    }

    // Kubo архивы имеют структуру: kubo/ipfs
    // Бинарник называется ipfs, но мы его переименовываем в kubo для ясности
    const innerDir = path.join(extractDir, 'kubo')
    const srcBin = path.join(innerDir, platform === 'win' ? 'ipfs.exe' : 'ipfs')

    // Создаём папку платформы
    if (fs.existsSync(platformDir)) {
      fs.rmSync(platformDir, { recursive: true })
    }
    fs.mkdirSync(platformDir, { recursive: true })

    // Копируем бинарник (переименовываем ipfs → kubo)
    if (fs.existsSync(srcBin)) {
      fs.copyFileSync(srcBin, kuboBin)

      // Делаем исполняемым на Unix
      if (platform !== 'win') {
        fs.chmodSync(kuboBin, 0o755)
      }
    } else {
      throw new Error(`Бинарник не найден: ${srcBin}`)
    }

    // Удаляем временные файлы
    fs.rmSync(extractDir, { recursive: true })
    fs.unlinkSync(tempFile)

    // Проверяем результат
    if (fs.existsSync(kuboBin)) {
      console.log('✅ Kubo установлен:', kuboBin)

      // Проверяем версию только для текущей платформы
      if (
        (platform === 'win' && process.platform === 'win32') ||
        (platform === 'linux' && process.platform === 'linux') ||
        (platform === 'darwin' && process.platform === 'darwin' && process.arch !== 'arm64') ||
        (platform === 'darwin-arm64' && process.platform === 'darwin' && process.arch === 'arm64')
      ) {
        try {
          const { stdout } = await execAsync(`"${kuboBin}" version`)
          console.log('   Версия:', stdout.trim())
        } catch {
          // Игнорируем ошибки проверки
        }
      }
    } else {
      console.error(`❌ Ошибка: ${config.binary} не найден после распаковки`)
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

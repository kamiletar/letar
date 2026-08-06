/**
 * Автоустановка FFmpeg с поддержкой SVT-AV1
 *
 * Скачивает сборку от BtbN при первом запуске:
 * https://github.com/BtbN/FFmpeg-Builds/releases
 */

import { exec, spawn } from 'child_process'
import { app } from 'electron'
import * as fs from 'fs'
import type { IncomingMessage } from 'http'
import * as https from 'https'
import * as path from 'path'
import { promisify } from 'util'

import { createModuleLogger } from './logger'

const log = createModuleLogger('FFmpegInstaller')
const execAsync = promisify(exec)

/** URL сборки FFmpeg с SVT-AV1 */
const FFMPEG_DOWNLOAD_URL =
  'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'

/** Имена бинарников */
const FFMPEG_BIN = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
const FFPROBE_BIN = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'

/** Папка платформы */
const PLATFORM_FOLDER = process.platform === 'win32' ? 'win' : process.platform === 'linux' ? 'linux' : 'mac'

/**
 * Получить путь к папке с бандлед FFmpeg
 * В production: resources/ffmpeg/ (бинарники напрямую)
 * В development: resources/ffmpeg/{win|linux}/ (платформо-специфичные папки)
 */
function getBundledFFmpegDir(): string | null {
  const isDev = !app.isPackaged

  // Production: resources/ffmpeg/ (electron-builder копирует туда)
  if (!isDev) {
    const resourcesPath = process.resourcesPath || path.join(app.getAppPath(), '..')
    const prodPath = path.join(resourcesPath, 'ffmpeg')
    if (fs.existsSync(path.join(prodPath, FFMPEG_BIN))) {
      return prodPath
    }
  }

  // Development: пробуем несколько возможных путей
  // nextron может менять app.getAppPath() в dev режиме
  const possibleRoots = [
    app.getAppPath(), // apps/animatrona или apps/animatrona/app
    path.join(app.getAppPath(), '..'), // На уровень выше
    path.resolve(__dirname, '..', '..'), // Относительно этого файла (main/utils → main → animatrona)
  ]

  for (const root of possibleRoots) {
    // Новая структура: resources/ffmpeg/{platform}/
    const platformPath = path.join(root, 'resources', 'ffmpeg', PLATFORM_FOLDER)
    if (fs.existsSync(path.join(platformPath, FFMPEG_BIN))) {
      return platformPath
    }

    // Старая структура: resources/ffmpeg/bin/
    const legacyPath = path.join(root, 'resources', 'ffmpeg', 'bin')
    if (fs.existsSync(path.join(legacyPath, FFMPEG_BIN))) {
      return legacyPath
    }
  }

  return null
}

/** Получить путь к папке для скачанного FFmpeg (userData) */
export function getDownloadedFFmpegDir(): string {
  return path.join(app.getPath('userData'), 'ffmpeg', 'bin')
}

/** Кэш для логирования (выводим путь только один раз) */
let ffmpegPathLogged = false

/** Получить путь к ffmpeg.exe */
export function getFFmpegPath(): string {
  // 1. Бандлед версия (в ресурсах приложения)
  const bundledDir = getBundledFFmpegDir()
  if (bundledDir) {
    const ffmpegPath = path.join(bundledDir, FFMPEG_BIN)
    if (!ffmpegPathLogged) {
      log.info('Using bundled FFmpeg', { path: ffmpegPath })
      ffmpegPathLogged = true
    }
    return ffmpegPath
  }

  // 2. Скачанная версия (в userData)
  const downloadedPath = path.join(getDownloadedFFmpegDir(), FFMPEG_BIN)
  if (fs.existsSync(downloadedPath)) {
    if (!ffmpegPathLogged) {
      log.info('Using downloaded FFmpeg', { path: downloadedPath })
      ffmpegPathLogged = true
    }
    return downloadedPath
  }

  // 3. Fallback на системный
  if (!ffmpegPathLogged) {
    log.info('Using system FFmpeg', { binary: FFMPEG_BIN })
    ffmpegPathLogged = true
  }
  return FFMPEG_BIN
}

/** Получить путь к ffprobe.exe */
export function getFFprobePath(): string {
  // 1. Бандлед версия
  const bundledDir = getBundledFFmpegDir()
  if (bundledDir) {
    return path.join(bundledDir, FFPROBE_BIN)
  }

  // 2. Скачанная версия
  const downloadedPath = path.join(getDownloadedFFmpegDir(), FFPROBE_BIN)
  if (fs.existsSync(downloadedPath)) {
    return downloadedPath
  }

  // 3. Fallback на системный
  return FFPROBE_BIN
}

/** Получить папку для скачивания FFmpeg */
export function getFFmpegDir(): string {
  return path.join(app.getPath('userData'), 'ffmpeg')
}

/** Проверить установлен ли FFmpeg (бандлед или системный) */
export async function isFFmpegInstalled(): Promise<boolean> {
  const ffmpegPath = getFFmpegPath()

  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-version'])

    proc.on('error', () => resolve(false))
    proc.on('close', (code) => resolve(code === 0))
  })
}

/** Проверить есть ли SVT-AV1 энкодер */
export async function hasSvtAv1(): Promise<boolean> {
  const ffmpegPath = getFFmpegPath()

  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-encoders'])
    let output = ''

    proc.stdout?.on('data', (data) => {
      output += data.toString()
    })

    proc.on('error', () => resolve(false))
    proc.on('close', () => resolve(output.includes('libsvtav1')))
  })
}

/** Скачать и установить FFmpeg */
export async function installFFmpeg(
  onProgress?: (progress: { stage: string; percent?: number }) => void,
): Promise<void> {
  const ffmpegDir = getFFmpegDir()
  const tempZip = path.join(app.getPath('temp'), 'ffmpeg-download.zip')

  try {
    onProgress?.({ stage: 'downloading', percent: 0 })

    // Скачиваем архив
    await downloadFile(FFMPEG_DOWNLOAD_URL, tempZip, (percent) => {
      onProgress?.({ stage: 'downloading', percent })
    })

    onProgress?.({ stage: 'extracting', percent: 0 })

    // Создаём папку
    if (!fs.existsSync(ffmpegDir)) {
      fs.mkdirSync(ffmpegDir, { recursive: true })
    }

    // Распаковываем
    await extractZip(tempZip, ffmpegDir)

    // Находим папку с бинарниками (архив содержит вложенную папку)
    const entries = fs.readdirSync(ffmpegDir)
    const innerDir = entries.find((e) => e.startsWith('ffmpeg-') && fs.statSync(path.join(ffmpegDir, e)).isDirectory())

    if (innerDir) {
      // Перемещаем содержимое из вложенной папки
      const innerPath = path.join(ffmpegDir, innerDir)
      const binSrc = path.join(innerPath, 'bin')
      const binDst = path.join(ffmpegDir, 'bin')

      if (fs.existsSync(binSrc)) {
        if (fs.existsSync(binDst)) {
          fs.rmSync(binDst, { recursive: true })
        }
        fs.renameSync(binSrc, binDst)
      }

      // Удаляем вложенную папку
      fs.rmSync(innerPath, { recursive: true })
    }

    onProgress?.({ stage: 'done', percent: 100 })

    log.info('FFmpeg installed', { directory: ffmpegDir })
  } finally {
    // Удаляем временный файл
    if (fs.existsSync(tempZip)) {
      fs.unlinkSync(tempZip)
    }
  }
}

/** Скачать файл с прогрессом */
async function downloadFile(url: string, destPath: string, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const followRedirects = (currentUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects'))
      }

      const protocol = currentUrl.startsWith('https') ? https : require('http')

      protocol
        .get(currentUrl, (response: IncomingMessage) => {
          // Обработка редиректов
          const statusCode = response.statusCode ?? 0
          if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
            return followRedirects(response.headers.location, redirectCount + 1)
          }

          if (statusCode !== 200) {
            return reject(new Error(`HTTP ${statusCode}`))
          }

          const totalSize = parseInt(response.headers['content-length'] || '0', 10)
          let downloadedSize = 0

          const file = fs.createWriteStream(destPath)

          response.on('data', (chunk: Buffer) => {
            downloadedSize += chunk.length
            if (totalSize > 0) {
              onProgress?.(Math.round((downloadedSize / totalSize) * 100))
            }
          })

          response.pipe(file)

          file.on('finish', () => {
            file.close()
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

/** Распаковать ZIP архив через PowerShell */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  // Используем PowerShell Expand-Archive (доступен на всех Windows 10+)
  const psCommand = `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`
  await execAsync(`powershell -Command "${psCommand}"`)
}

/** Удалить установленный FFmpeg */
export function uninstallFFmpeg(): void {
  const ffmpegDir = getFFmpegDir()
  if (fs.existsSync(ffmpegDir)) {
    fs.rmSync(ffmpegDir, { recursive: true })
    log.info('FFmpeg uninstalled')
  }
}

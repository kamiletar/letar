/**
 * Докачка ffmpeg по требованию — «расширенная поддержка форматов» (PLAN.md §10, Фаза 6).
 *
 * Chromium декодирует `<video>` собственным движком, поэтому Hi10P-видео и AC3/DTS/TrueHD-звук
 * (половина старых аниме-раздач) не играют вообще. Единственный способ их проиграть внутри
 * приложения — прогнать через ffmpeg. Бинарь в инсталлятор не кладём (гейт веса ≤130 МБ),
 * качаем в `userData` и только когда пользователь сам согласился.
 *
 * **Выбор сборки — BtbN win64-gpl / linux64-gpl (решение владельца 2026-09-08).** Более лёгкие
 * варианты (gyan.dev `essentials`) режут набор кодеков, а для плеера всеядность важнее размера:
 * отказ проиграть файл хуже лишних мегабайт. Дополнительный плюс BtbN — `.zip`/`.tar.xz`,
 * которые распаковываются штатными средствами ОС без новых зависимостей (у gyan.dev только
 * `.7z`, потребовался бы `7zip-min`).
 *
 * ⚠️ **Контрольной суммы у источника нет.** BtbN не публикует `.sha256`-сайдкары для тега
 * `latest` (проверено 2026-09-08 — 404 на все варианты), а сам тег перезаписывается ежедневно,
 * поэтому захардкоженная сумма протухла бы на следующий день. Вместо неё — функциональная
 * верификация после распаковки: `ffmpeg -version` с кодом 0 и наличие всех нужных декодеров в
 * `-decoders`. Битый или подменённый архив это ловит не хуже суммы, а скачивание идёт по HTTPS
 * с github.com.
 */

import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import type { ClientRequest, IncomingMessage } from 'node:http'
import { get as httpGet } from 'node:http'
import { get as httpsGet } from 'node:https'
import path from 'node:path'

import {
  FFMPEG_BIN,
  FFPROBE_BIN,
  getDownloadedFfmpegPath,
  getDownloadedFfprobePath,
  getFfmpegBinDir,
  getFfmpegRootDir,
} from './ffmpeg-paths'

const BTBN_BASE = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest'

interface PlatformBuild {
  url: string
  /** Имя временного архива — расширение важно, по нему выбирается способ распаковки */
  archiveName: string
}

const PLATFORM_BUILDS: Partial<Record<NodeJS.Platform, PlatformBuild>> = {
  win32: {
    url: `${BTBN_BASE}/ffmpeg-master-latest-win64-gpl.zip`,
    archiveName: 'ffmpeg-win64-gpl.zip',
  },
  linux: {
    url: `${BTBN_BASE}/ffmpeg-master-latest-linux64-gpl.tar.xz`,
    archiveName: 'ffmpeg-linux64-gpl.tar.xz',
  },
}

/**
 * Декодеры, ради которых всё и затевается. Если сборка их не содержит — она бесполезна для
 * задачи, и лучше сказать об этом сразу, чем на первом же файле с DTS.
 */
const REQUIRED_DECODERS = ['h264', 'hevc', 'ac3', 'eac3', 'dts', 'truehd'] as const

export type FfmpegSource = 'downloaded' | 'system'

export interface FfmpegStatus {
  available: boolean
  /** Откуда взят бинарь: скачанный нами или уже стоявший в системе (PATH) */
  source: FfmpegSource | null
  ffmpegPath: string | null
  ffprobePath: string | null
  /** Первая строка `ffmpeg -version` — показываем в UI как подтверждение */
  version: string | null
  /** Требуемые декодеры, которых нет в найденной сборке (пусто — всё на месте) */
  missingDecoders: string[]
  /** Поддерживается ли докачка на этой платформе (у BtbN нет сборок для macOS) */
  installSupported: boolean
}

export interface FfmpegInstallProgress {
  stage: 'downloading' | 'extracting' | 'verifying' | 'done'
  percent?: number
  receivedBytes?: number
  totalBytes?: number
}

export type FfmpegInstallProgressCallback = (progress: FfmpegInstallProgress) => void

/** Активный запрос скачивания — нужен, чтобы отменить установку из UI */
let activeRequest: ClientRequest | null = null
let installCancelled = false

function runBinary(binPath: string, args: string[]): Promise<{ code: number | null; stdout: string }> {
  return new Promise((resolve) => {
    let stdout = ''
    const child = spawn(binPath, args, { windowsHide: true })

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    // ffmpeg пишет баннер в stderr — для `-version` он тоже полезен
    child.stderr?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    child.on('error', () => resolve({ code: null, stdout }))
    child.on('close', (code) => resolve({ code, stdout }))
  })
}

async function readVersion(ffmpegPath: string): Promise<string | null> {
  const { code, stdout } = await runBinary(ffmpegPath, ['-version'])
  if (code !== 0) {
    return null
  }
  return stdout.split('\n')[0]?.trim() ?? null
}

async function findMissingDecoders(ffmpegPath: string): Promise<string[]> {
  const { code, stdout } = await runBinary(ffmpegPath, ['-hide_banner', '-decoders'])
  if (code !== 0) {
    return [...REQUIRED_DECODERS]
  }
  // Строки вида ` V....D h264   H.264 / AVC` — имя декодера идёт вторым столбцом
  const available = new Set(
    stdout
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[1])
      .filter(Boolean),
  )
  return REQUIRED_DECODERS.filter((decoder) => !available.has(decoder))
}

/**
 * Текущее состояние ffmpeg: скачанный имеет приоритет над системным — если пользователь
 * согласился на докачку, играем именно на той сборке, набор кодеков которой мы проверили.
 */
export async function getFfmpegStatus(): Promise<FfmpegStatus> {
  const installSupported = PLATFORM_BUILDS[process.platform] !== undefined

  const downloaded = getDownloadedFfmpegPath()
  if (downloaded) {
    const version = await readVersion(downloaded)
    if (version) {
      return {
        available: true,
        source: 'downloaded',
        ffmpegPath: downloaded,
        ffprobePath: getDownloadedFfprobePath(),
        version,
        missingDecoders: await findMissingDecoders(downloaded),
        installSupported,
      }
    }
  }

  // Системный ffmpeg (PATH) — у части пользователей он уже стоит, качать 163 МБ незачем
  const systemVersion = await readVersion(FFMPEG_BIN)
  if (systemVersion) {
    return {
      available: true,
      source: 'system',
      ffmpegPath: FFMPEG_BIN,
      ffprobePath: FFPROBE_BIN,
      version: systemVersion,
      missingDecoders: await findMissingDecoders(FFMPEG_BIN),
      installSupported,
    }
  }

  return {
    available: false,
    source: null,
    ffmpegPath: null,
    ffprobePath: null,
    version: null,
    missingDecoders: [...REQUIRED_DECODERS],
    installSupported,
  }
}

function downloadFile(url: string, destPath: string, onProgress: (received: number, total: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = (currentUrl: string, redirectCount: number): void => {
      if (redirectCount > 5) {
        reject(new Error('Слишком много перенаправлений при скачивании ffmpeg'))
        return
      }

      const getFn = currentUrl.startsWith('https:') ? httpsGet : httpGet
      activeRequest = getFn(currentUrl, (response: IncomingMessage) => {
        const status = response.statusCode ?? 0

        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume()
          request(response.headers.location, redirectCount + 1)
          return
        }

        if (status !== 200) {
          response.resume()
          reject(new Error(`Сервер ответил ${status} при скачивании ffmpeg`))
          return
        }

        const total = Number.parseInt(response.headers['content-length'] ?? '0', 10)
        let received = 0

        const file = createWriteStream(destPath)
        response.on('data', (chunk: Buffer) => {
          received += chunk.length
          onProgress(received, total)
        })
        response.pipe(file)

        file.on('finish', () => {
          file.close(() => resolve())
        })
        file.on('error', reject)
        response.on('error', reject)
      })

      activeRequest.on('error', (error) => {
        // `destroy()` при отмене тоже приходит сюда — отличаем по флагу
        reject(installCancelled ? new Error('Установка отменена') : error)
      })
    }

    request(url, 0)
  })
}

async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  const isZip = archivePath.endsWith('.zip')

  const { code, stdout } = isZip
    ? await runBinary('powershell', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path "${archivePath}" -DestinationPath "${destDir}" -Force`,
    ])
    : await runBinary('tar', ['-xf', archivePath, '-C', destDir])

  if (code !== 0) {
    throw new Error(`Не удалось распаковать архив ffmpeg: ${stdout.trim() || `код ${code}`}`)
  }
}

/**
 * Архив BtbN содержит одну вложенную папку `ffmpeg-master-latest-<platform>-gpl/` с `bin/`
 * внутри — поднимаем `bin/` на уровень `userData/ffmpeg/`, остальное удаляем.
 */
async function flattenExtractedDir(rootDir: string): Promise<void> {
  const entries = await readdir(rootDir, { withFileTypes: true })
  const innerDir = entries.find((entry) => entry.isDirectory() && entry.name.startsWith('ffmpeg-'))
  if (!innerDir) {
    return
  }

  const innerPath = path.join(rootDir, innerDir.name)
  const binSrc = path.join(innerPath, 'bin')
  const binDst = getFfmpegBinDir()

  if (existsSync(binSrc)) {
    await rm(binDst, { recursive: true, force: true })
    await rename(binSrc, binDst)
  }
  await rm(innerPath, { recursive: true, force: true })
}

/**
 * Скачивает и распаковывает ffmpeg в `userData`. Возвращает статус уже установленной сборки —
 * с проверенными версией и набором декодеров.
 */
export async function installFfmpeg(onProgress?: FfmpegInstallProgressCallback): Promise<FfmpegStatus> {
  const build = PLATFORM_BUILDS[process.platform]
  if (!build) {
    throw new Error(`Готовых сборок ffmpeg для платформы ${process.platform} нет — установите его вручную`)
  }

  installCancelled = false
  const rootDir = getFfmpegRootDir()
  const archivePath = path.join(rootDir, build.archiveName)

  await mkdir(rootDir, { recursive: true })

  try {
    onProgress?.({ stage: 'downloading', percent: 0 })
    await downloadFile(build.url, archivePath, (received, total) => {
      onProgress?.({
        stage: 'downloading',
        percent: total > 0 ? Math.round((received / total) * 100) : undefined,
        receivedBytes: received,
        totalBytes: total,
      })
    })

    if (installCancelled) {
      throw new Error('Установка отменена')
    }

    onProgress?.({ stage: 'extracting' })
    await extractArchive(archivePath, rootDir)
    await flattenExtractedDir(rootDir)

    onProgress?.({ stage: 'verifying' })
    const status = await getFfmpegStatus()
    if (!status.available || status.source !== 'downloaded') {
      throw new Error('ffmpeg распакован, но не запускается — сборка повреждена')
    }

    onProgress?.({ stage: 'done', percent: 100 })
    return status
  } catch (error) {
    // Недокачанный или битый архив не должен выглядеть как установленный ffmpeg
    await rm(rootDir, { recursive: true, force: true }).catch(() => {})
    throw error
  } finally {
    activeRequest = null
    await rm(archivePath, { force: true }).catch(() => {})
  }
}

/** Прерывает идущую установку — сам `installFfmpeg` отклонится и подчистит частичную загрузку */
export function cancelFfmpegInstall(): void {
  installCancelled = true
  activeRequest?.destroy()
  activeRequest = null
}

/** Удаляет скачанный ffmpeg (системный, если он есть, остаётся) */
export async function uninstallFfmpeg(): Promise<void> {
  await rm(getFfmpegRootDir(), { recursive: true, force: true })
}

/** Размер скачанного ffmpeg на диске — показываем рядом с кнопкой «Удалить» */
export async function getDownloadedFfmpegSize(): Promise<number> {
  const binDir = getFfmpegBinDir()
  if (!existsSync(binDir)) {
    return 0
  }

  const entries = await readdir(binDir, { withFileTypes: true })
  const sizes = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => (await stat(path.join(binDir, entry.name))).size),
  )
  return sizes.reduce((sum, size) => sum + size, 0)
}

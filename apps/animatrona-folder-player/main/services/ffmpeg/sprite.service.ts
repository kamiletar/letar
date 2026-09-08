/**
 * Нарезка спрайт-листа с превью кадров для перемотки (PLAN.md §10.1).
 *
 * Показ превью уже умеет `TimelinePreview` из `@letar/video-player-react` — тот же компонент,
 * что в полной Animatrona. Там спрайты нарезаются при импорте, здесь импорта нет, поэтому
 * нарезаем по требованию тем же ffmpeg, что и «неудобные» форматы.
 *
 * Генерация идёт в фоне, уже после старта воспроизведения: она требует полного декодирования
 * дорожки и на серию занимает десятки секунд. Превью просто появляется, когда готово, —
 * задерживать из-за него начало просмотра нельзя.
 */

import { createModuleLogger } from '@letar/folder-scan'
import { app } from 'electron'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { buildSpriteFilter, buildSpriteVtt, planSpriteLayout } from '@shared/sprite-layout'
import { getFfmpegStatus } from './ffmpeg-installer.service'

const log = createModuleLogger('Sprite')

/** Потолок кэша спрайтов — они мелкие (сотни КБ), но копятся по файлу на каждую серию */
const CACHE_LIMIT_BYTES = 512 * 1024 * 1024

export interface SpriteResult {
  /** Путь к картинке-спрайту — рендерер отдаёт его через `media://` */
  spritePath: string
  /** Содержимое WebVTT — рендерер парсит его `parseSpriteCues` из библиотеки плеера */
  vtt: string
  fromCache: boolean
}

function getCacheDir(): string {
  return path.join(app.getPath('userData'), 'sprites')
}

/** Ключ учитывает содержимое файла: перезалитая раздача тем же именем даст новый спрайт */
async function buildCacheKey(filePath: string): Promise<string> {
  const stats = await stat(filePath)
  return createHash('sha1').update([filePath, stats.mtimeMs, stats.size].join('|')).digest('hex')
}

let activeProcess: ChildProcess | null = null
let cancelled = false

/**
 * Готовит спрайт превью для файла. Возвращает `null`, если ffmpeg недоступен или длительность
 * неизвестна — это не ошибка, просто превью не будет (плеер работает как раньше).
 */
export async function generateSprite(filePath: string, durationSec: number): Promise<SpriteResult | null> {
  const layout = planSpriteLayout(durationSec)
  if (!layout) {
    return null
  }

  const status = await getFfmpegStatus()
  if (!status.available || !status.ffmpegPath) {
    return null
  }

  const cacheDir = getCacheDir()
  await mkdir(cacheDir, { recursive: true })

  const key = await buildCacheKey(filePath)
  const spritePath = path.join(cacheDir, `${key}.jpg`)
  const vttPath = path.join(cacheDir, `${key}.vtt`)

  if (existsSync(spritePath) && existsSync(vttPath)) {
    return { spritePath, vtt: await readFile(vttPath, 'utf8'), fromCache: true }
  }

  const partialPath = `${spritePath}.part.jpg`
  cancelled = false

  await new Promise<void>((resolve, reject) => {
    const args = [
      '-y',
      '-hide_banner',
      '-nostdin',
      '-i',
      filePath,
      '-vf',
      buildSpriteFilter(layout),
      // Один выходной кадр — сам спрайт-лист, склеенный фильтром tile
      '-frames:v',
      '1',
      '-q:v',
      '5',
      '-an',
      '-sn',
      partialPath,
    ]

    log.info('Нарезка спрайта', { file: filePath, frames: layout.frameCount, interval: layout.intervalSec })
    const child = spawn(status.ffmpegPath as string, args, { windowsHide: true })
    activeProcess = child

    let stderrTail = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-1000)
    })

    child.on('error', reject)
    child.on('close', (code) => {
      activeProcess = null
      if (cancelled) {
        reject(new Error('Нарезка превью отменена'))
        return
      }
      if (code !== 0) {
        reject(new Error(`ffmpeg завершился с кодом ${code}: ${stderrTail.trim().split('\n').slice(-2).join(' ')}`))
        return
      }
      resolve()
    })
  }).catch(async (error) => {
    await rm(partialPath, { force: true }).catch(() => {})
    throw error
  })

  const vtt = buildSpriteVtt(path.basename(spritePath), layout, durationSec)
  await writeFile(vttPath, vtt, 'utf8')
  // Переименование последним шагом: пока файл `*.part.jpg`, кэш его не отдаст
  await rename(partialPath, spritePath)

  await pruneCache().catch((error) => log.warn('Не удалось почистить кэш спрайтов', { error: String(error) }))

  return { spritePath, vtt, fromCache: false }
}

/** Прерывает идущую нарезку — например при переключении эпизода */
export function cancelSpriteGeneration(): void {
  cancelled = true
  activeProcess?.kill()
  activeProcess = null
}

/** Суммарный размер кэша спрайтов */
export async function getSpriteCacheSize(): Promise<number> {
  const cacheDir = getCacheDir()
  if (!existsSync(cacheDir)) {
    return 0
  }
  const entries = await readdir(cacheDir, { withFileTypes: true })
  const sizes = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => (await stat(path.join(cacheDir, entry.name))).size),
  )
  return sizes.reduce((sum, size) => sum + size, 0)
}

/** Полная очистка кэша спрайтов */
export async function clearSpriteCache(): Promise<void> {
  await rm(getCacheDir(), { recursive: true, force: true })
}

/** Вытесняет самые давние спрайты вместе с их VTT, пока кэш не уложится в лимит */
async function pruneCache(): Promise<void> {
  const cacheDir = getCacheDir()
  const entries = await readdir(cacheDir, { withFileTypes: true })
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jpg'))
      .map(async (entry) => {
        const fullPath = path.join(cacheDir, entry.name)
        const stats = await stat(fullPath)
        return { fullPath, size: stats.size, mtimeMs: stats.mtimeMs }
      }),
  )

  let total = files.reduce((sum, file) => sum + file.size, 0)
  if (total <= CACHE_LIMIT_BYTES) {
    return
  }

  for (const file of files.sort((a, b) => a.mtimeMs - b.mtimeMs)) {
    if (total <= CACHE_LIMIT_BYTES) {
      break
    }
    await rm(file.fullPath, { force: true })
    await rm(file.fullPath.replace(/\.jpg$/, '.vtt'), { force: true })
    total -= file.size
  }
}

/**
 * Резолв путей к бинарникам ffmpeg. В отличие от `animatrona`, это приложение **не поставляет**
 * ffmpeg внутри инсталлятора (гейт веса ≤130 МБ, см. PLAN.md §8) — бинарь либо уже есть в
 * системе (PATH), либо скачивается по требованию в `userData` (см. `ffmpeg-installer.service`).
 *
 * ⚖️ Отсюда же следует лицензионный плюс: сборки BtbN — GPL, но раз ffmpeg не входит в
 * дистрибутив, а скачивается пользователем и вызывается как отдельный процесс через CLI,
 * вопрос «производного произведения» не встаёт (PLAN.md §10).
 */

import { app } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'

const IS_WINDOWS = process.platform === 'win32'

export const FFMPEG_BIN = IS_WINDOWS ? 'ffmpeg.exe' : 'ffmpeg'
export const FFPROBE_BIN = IS_WINDOWS ? 'ffprobe.exe' : 'ffprobe'

/** Корень скачанного ffmpeg — удаляется целиком при «Удалить» в UI */
export function getFfmpegRootDir(): string {
  return path.join(app.getPath('userData'), 'ffmpeg')
}

/** Папка с бинарниками внутри скачанного ffmpeg */
export function getFfmpegBinDir(): string {
  return path.join(getFfmpegRootDir(), 'bin')
}

/** Путь к скачанному `ffmpeg`, либо `null` если он не установлен */
export function getDownloadedFfmpegPath(): string | null {
  const candidate = path.join(getFfmpegBinDir(), FFMPEG_BIN)
  return existsSync(candidate) ? candidate : null
}

/** Путь к скачанному `ffprobe`, либо `null` если он не установлен */
export function getDownloadedFfprobePath(): string | null {
  const candidate = path.join(getFfmpegBinDir(), FFPROBE_BIN)
  return existsSync(candidate) ? candidate : null
}

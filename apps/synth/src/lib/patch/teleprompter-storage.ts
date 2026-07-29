// Персистентное хранилище текста и скорости суфлёра (Фаза 5 — репетиция спокен-ворда).
// load/save на localStorage — общий хелпер `local-storage-string.ts` (тот же паттерн, что был
// у `pad-midi-map.ts`, вынесен туда после второго дублирования).

import { loadLocalStorageString, saveLocalStorageString } from './local-storage-string'

const LYRICS_KEY = 'synth:teleprompter-lyrics'
const SPEED_KEY = 'synth:teleprompter-speed'

export const DEFAULT_TELEPROMPTER_SPEED = 30 // пикселей в секунду
export const MIN_TELEPROMPTER_SPEED = 5
export const MAX_TELEPROMPTER_SPEED = 150

export function loadTeleprompterLyrics(): string {
  return loadLocalStorageString(LYRICS_KEY) ?? ''
}

export function saveTeleprompterLyrics(text: string): void {
  saveLocalStorageString(LYRICS_KEY, text)
}

export function loadTeleprompterSpeed(): number {
  const raw = loadLocalStorageString(SPEED_KEY)
  const parsed = raw ? Number(raw) : NaN
  if (Number.isFinite(parsed) && parsed >= MIN_TELEPROMPTER_SPEED && parsed <= MAX_TELEPROMPTER_SPEED) {
    return parsed
  }
  return DEFAULT_TELEPROMPTER_SPEED
}

export function saveTeleprompterSpeed(speed: number): void {
  saveLocalStorageString(SPEED_KEY, String(speed))
}

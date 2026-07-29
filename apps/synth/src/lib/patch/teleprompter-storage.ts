// Персистентное хранилище текста и скорости суфлёра (Фаза 5 — репетиция спокен-ворда).
// Тот же паттерн, что `pad-midi-map.ts`: localStorage, ключ с префиксом `synth:`, try/catch,
// SSR-guard на `window` — суфлёр не про звук, поэтому IndexedDB (как у патчей/сэмплов) избыточна.

const LYRICS_KEY = 'synth:teleprompter-lyrics'
const SPEED_KEY = 'synth:teleprompter-speed'

export const DEFAULT_TELEPROMPTER_SPEED = 30 // пикселей в секунду
export const MIN_TELEPROMPTER_SPEED = 5
export const MAX_TELEPROMPTER_SPEED = 150

export function loadTeleprompterLyrics(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  try {
    return window.localStorage.getItem(LYRICS_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveTeleprompterLyrics(text: string): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(LYRICS_KEY, text)
}

export function loadTeleprompterSpeed(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_TELEPROMPTER_SPEED
  }
  try {
    const raw = window.localStorage.getItem(SPEED_KEY)
    const parsed = raw ? Number(raw) : NaN
    if (Number.isFinite(parsed) && parsed >= MIN_TELEPROMPTER_SPEED && parsed <= MAX_TELEPROMPTER_SPEED) {
      return parsed
    }
    return DEFAULT_TELEPROMPTER_SPEED
  } catch {
    return DEFAULT_TELEPROMPTER_SPEED
  }
}

export function saveTeleprompterSpeed(speed: number): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(SPEED_KEY, String(speed))
}

/**
 * Локальная копия стихов поэта для режима чтеца (`/reader`).
 *
 * Данные лежат в localStorage телефона: стихи — это килобайты текста, а чтение должно
 * работать без сети и без обращения к серверу. Страница `/reader` статична и кэшируется
 * service worker'ом, поэтому от авторизованных страниц `/poet/*` она не зависит.
 */

/** Стихотворение в локальной копии */
export interface ReaderPoem {
  id: string
  title: string
  text: string
  published: boolean
  updatedAt: string
}

/** Снимок всех стихов поэта на момент последней синхронизации */
export interface ReaderSnapshot {
  poetName: string
  /** ISO-время последней успешной синхронизации */
  syncedAt: string
  poems: ReaderPoem[]
}

/** Настройки чтения, которые переживают перезагрузку страницы */
export interface ReaderPrefs {
  /** Открытое стихотворение; null — показан список */
  poemId: string | null
  /** Размер шрифта текста, px */
  fontSize: number
}

export const MIN_FONT_SIZE = 16
export const MAX_FONT_SIZE = 56
export const DEFAULT_FONT_SIZE = 26

const SNAPSHOT_KEY = 'grandslamcup-reader-snapshot'
const PREFS_KEY = 'grandslamcup-reader-prefs'

/** Результат запроса к серверу */
export type SyncResult =
  | { status: 'ok'; snapshot: ReaderSnapshot }
  | { status: 'unauthorized' }
  | { status: 'offline' }
  | { status: 'error' }

/** Ограничивает размер шрифта допустимым диапазоном */
export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_FONT_SIZE
  }
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)))
}

function isReaderPoem(value: unknown): value is ReaderPoem {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const poem = value as Record<string, unknown>
  return typeof poem.id === 'string'
    && typeof poem.title === 'string'
    && typeof poem.text === 'string'
    && typeof poem.published === 'boolean'
    && typeof poem.updatedAt === 'string'
}

/** Проверяет, что разобранный JSON похож на снимок; битые данные не должны ронять страницу */
export function parseSnapshot(value: unknown): ReaderSnapshot | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const raw = value as Record<string, unknown>
  if (typeof raw.poetName !== 'string' || typeof raw.syncedAt !== 'string' || !Array.isArray(raw.poems)) {
    return null
  }
  return {
    poetName: raw.poetName,
    syncedAt: raw.syncedAt,
    poems: raw.poems.filter(isReaderPoem),
  }
}

/** Читает локальную копию стихов; при любой ошибке хранилища возвращает null */
export function loadSnapshot(): ReaderSnapshot | null {
  try {
    const stored = localStorage.getItem(SNAPSHOT_KEY)
    return stored ? parseSnapshot(JSON.parse(stored)) : null
  } catch {
    return null
  }
}

/** Сохраняет локальную копию; возвращает false, если хранилище недоступно или переполнено */
export function saveSnapshot(snapshot: ReaderSnapshot): boolean {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
    return true
  } catch {
    return false
  }
}

/** Читает настройки чтения */
export function loadPrefs(): ReaderPrefs {
  const fallback: ReaderPrefs = { poemId: null, fontSize: DEFAULT_FONT_SIZE }
  try {
    const stored = localStorage.getItem(PREFS_KEY)
    if (!stored) {
      return fallback
    }
    const raw = JSON.parse(stored) as Partial<ReaderPrefs>
    return {
      poemId: typeof raw.poemId === 'string' ? raw.poemId : null,
      fontSize: clampFontSize(typeof raw.fontSize === 'number' ? raw.fontSize : DEFAULT_FONT_SIZE),
    }
  } catch {
    return fallback
  }
}

/** Сохраняет настройки чтения */
export function savePrefs(prefs: ReaderPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // хранилище недоступно — настройки просто не переживут перезагрузку
  }
}

/**
 * Забирает свежие стихи с сервера и сохраняет их локально.
 * Без сети или без входа возвращает статус, а локальную копию не трогает.
 */
export async function syncSnapshot(): Promise<SyncResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { status: 'offline' }
  }

  try {
    const response = await fetch('/api/poet/poems', { cache: 'no-store', credentials: 'same-origin' })

    if (response.status === 401) {
      return { status: 'unauthorized' }
    }
    if (!response.ok) {
      return { status: 'error' }
    }

    const snapshot = parseSnapshot(await response.json())
    if (!snapshot) {
      return { status: 'error' }
    }

    saveSnapshot(snapshot)
    return { status: 'ok', snapshot }
  } catch {
    // fetch бросает TypeError, когда сети нет, хотя navigator.onLine ещё говорит «да»
    return { status: 'offline' }
  }
}

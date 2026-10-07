/**
 * Локальная копия стихов поэта и очередь правок для режима чтеца (`/reader`).
 *
 * Данные лежат в localStorage телефона: стихи — это килобайты текста, а чтение и правка
 * должны работать без сети и без обращения к серверу. Страница `/reader` статична и
 * кэшируется service worker'ом, поэтому от авторизованных страниц `/poet/*` она не зависит.
 *
 * Правки, сделанные без сети, лежат в очереди (`PendingChange`) и уходят на сервер одним
 * запросом, когда сеть появляется. Серверная копия (`ReaderSnapshot`) очередью никогда не
 * перезаписывается: на экране показывается слияние обоих (`mergePoems`).
 */

// ───────────────────────── Типы ─────────────────────────

/** Стихотворение в серверной копии */
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

/** Редактируемые поля стихотворения */
export interface PoemDraft {
  title: string
  text: string
  published: boolean
}

export type PendingKind = 'create' | 'update' | 'delete'

/** Версия стихотворения на сайте, с которой разошлась локальная правка */
export interface ConflictServerVersion extends PoemDraft {
  updatedAt: string
}

/** Правка, ещё не отправленная на сервер */
export interface PendingChange extends PoemDraft {
  /** id стихотворения: серверный или `local-…` для нового */
  id: string
  kind: PendingKind
  /** `updatedAt` серверной версии, от которой правили; у новых стихов null */
  baseUpdatedAt: string | null
  /** Когда правка сделана (ISO) */
  editedAt: string
  /** Версия с сайта, если там стих успели изменить; такую правку не отправляем, пока не выберут */
  conflict: ConflictServerVersion | null
}

/** Стихотворение для показа: серверная версия с наложенной локальной правкой */
export interface DisplayPoem extends ReaderPoem {
  pending: PendingKind | null
  conflict: boolean
}

/** Правка в том виде, в каком она уходит на сервер */
export type WireChange =
  | { kind: 'create'; id: string; title: string; text: string; published: boolean }
  | { kind: 'update'; id: string; title: string; text: string; published: boolean; baseUpdatedAt: string }
  | { kind: 'delete'; id: string }

/** Итог по одной правке (ответ сервера) */
export interface ChangeResult {
  id: string
  status: 'ok' | 'conflict' | 'missing' | 'invalid' | 'error'
  /** Серверная версия после создания/обновления */
  poem?: ReaderPoem
  /** Версия на сайте при конфликте */
  server?: ReaderPoem
}

/** Результат запроса к серверу */
export type SyncResult =
  | {
    status: 'ok'
    snapshot: ReaderSnapshot
    results: ChangeResult[]
    /** editedAt правок на момент отправки: по нему видно, правили ли стих, пока шёл запрос */
    sent: Record<string, string>
  }
  | { status: 'unauthorized' }
  | { status: 'offline' }
  | { status: 'error' }

export const MIN_FONT_SIZE = 16
export const MAX_FONT_SIZE = 56
export const DEFAULT_FONT_SIZE = 26
export const LOCAL_ID_PREFIX = 'local-'

const SNAPSHOT_KEY = 'grandslamcup-reader-snapshot'
const PREFS_KEY = 'grandslamcup-reader-prefs'
const PENDING_KEY = 'grandslamcup-reader-pending'

// ───────────────────────── Разбор и проверка данных ─────────────────────────

/** Ограничивает размер шрифта допустимым диапазоном */
export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_FONT_SIZE
  }
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)))
}

export function isReaderPoem(value: unknown): value is ReaderPoem {
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

function isConflict(value: unknown): value is ConflictServerVersion {
  return isReaderPoem(value)
}

function isPendingChange(value: unknown): value is PendingChange {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const change = value as Record<string, unknown>
  return typeof change.id === 'string'
    && (change.kind === 'create' || change.kind === 'update' || change.kind === 'delete')
    && typeof change.title === 'string'
    && typeof change.text === 'string'
    && typeof change.published === 'boolean'
    && typeof change.editedAt === 'string'
    && (change.baseUpdatedAt === null || typeof change.baseUpdatedAt === 'string')
    && (change.conflict === null || isConflict(change.conflict))
}

/** Разбирает ответ сервера: снимок плюс итоги по отправленным правкам */
function parseSyncResponse(value: unknown): { snapshot: ReaderSnapshot; results: ChangeResult[] } | null {
  const snapshot = parseSnapshot(value)
  if (!snapshot) {
    return null
  }
  const rawResults = (value as { results?: unknown }).results
  if (rawResults === undefined) {
    return { snapshot, results: [] }
  }
  if (!Array.isArray(rawResults)) {
    return null
  }
  const results: ChangeResult[] = []
  for (const item of rawResults) {
    if (typeof item !== 'object' || item === null) {
      continue
    }
    const raw = item as Record<string, unknown>
    const known = ['ok', 'conflict', 'missing', 'invalid', 'error']
    if (typeof raw.id !== 'string' || typeof raw.status !== 'string' || !known.includes(raw.status)) {
      continue
    }
    results.push({
      id: raw.id,
      status: raw.status as ChangeResult['status'],
      poem: isReaderPoem(raw.poem) ? raw.poem : undefined,
      server: isReaderPoem(raw.server) ? raw.server : undefined,
    })
  }
  return { snapshot, results }
}

// ───────────────────────── localStorage ─────────────────────────

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

/** Читает очередь неотправленных правок */
export function loadPending(): PendingChange[] {
  try {
    const stored = localStorage.getItem(PENDING_KEY)
    const parsed: unknown = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed.filter(isPendingChange) : []
  } catch {
    return []
  }
}

/** Сохраняет очередь правок; false — хранилище недоступно, правка не переживёт перезагрузку */
export function savePending(pending: PendingChange[]): boolean {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
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

// ───────────────────────── Очередь правок ─────────────────────────

/** id для нового стихотворения, пока у него нет серверного */
export function createLocalId(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${LOCAL_ID_PREFIX}${random}`
}

export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX)
}

function cleanDraft(draft: PoemDraft): PoemDraft {
  return { title: draft.title.trim(), text: draft.text.replace(/\s+$/, ''), published: draft.published }
}

function sameContent(a: PoemDraft, b: PoemDraft): boolean {
  return a.title === b.title && a.text === b.text && a.published === b.published
}

/**
 * Стихи для показа: серверная копия с наложенными правками.
 * Новые (и те, чей оригинал пропал с сайта) идут первыми, удалённые скрыты.
 */
export function mergePoems(serverPoems: ReaderPoem[], pending: PendingChange[]): DisplayPoem[] {
  const byId = new Map(pending.map((change) => [change.id, change]))
  const serverIds = new Set(serverPoems.map((poem) => poem.id))

  const created: DisplayPoem[] = pending
    .filter((change) => change.kind === 'create' || (change.kind === 'update' && !serverIds.has(change.id)))
    .sort((a, b) => b.editedAt.localeCompare(a.editedAt))
    .map((change) => ({
      id: change.id,
      title: change.title,
      text: change.text,
      published: change.published,
      updatedAt: change.editedAt,
      pending: 'create' as const,
      conflict: false,
    }))

  const fromServer = serverPoems.flatMap((poem): DisplayPoem[] => {
    const change = byId.get(poem.id)
    if (!change) {
      return [{ ...poem, pending: null, conflict: false }]
    }
    if (change.kind === 'delete') {
      return []
    }
    if (change.kind === 'create') {
      // такой id уже есть на сайте — серверная версия главнее старой записи очереди
      return [{ ...poem, pending: null, conflict: false }]
    }
    return [{
      ...poem,
      title: change.title,
      text: change.text,
      published: change.published,
      pending: 'update',
      conflict: change.conflict !== null,
    }]
  })

  return [...created, ...fromServer]
}

/** Стихи, помеченные на удаление и ещё не отправленные: их можно вернуть */
export function listPendingDeletes(serverPoems: ReaderPoem[], pending: PendingChange[]): ReaderPoem[] {
  const deleted = new Set(pending.filter((change) => change.kind === 'delete').map((change) => change.id))
  return serverPoems.filter((poem) => deleted.has(poem.id))
}

/**
 * Записывает правку стихотворения в очередь.
 * `id` = null — новое стихотворение. Правка, не меняющая текст относительно сайта, очередь не пополняет.
 */
export function recordSave(
  pending: PendingChange[],
  serverPoems: ReaderPoem[],
  id: string | null,
  draft: PoemDraft,
  now: string = new Date().toISOString(),
): { pending: PendingChange[]; id: string } {
  const clean = cleanDraft(draft)

  if (id === null) {
    const newId = createLocalId()
    const change: PendingChange = {
      id: newId,
      kind: 'create',
      ...clean,
      baseUpdatedAt: null,
      editedAt: now,
      conflict: null,
    }
    return { pending: [...pending, change], id: newId }
  }

  const server = serverPoems.find((poem) => poem.id === id)
  const existing = pending.find((change) => change.id === id)

  if (existing) {
    const kind: PendingKind = existing.kind === 'delete' ? 'update' : existing.kind
    // правка вернула текст к серверному — очередь не нужна (если нет конфликта)
    if (kind === 'update' && server && existing.conflict === null && sameContent(clean, server)) {
      return { pending: pending.filter((change) => change.id !== id), id }
    }
    return {
      pending: pending.map((change) => (change.id === id ? { ...change, ...clean, kind, editedAt: now } : change)),
      id,
    }
  }

  if (!server || sameContent(clean, server)) {
    return { pending, id }
  }

  const change: PendingChange = {
    id,
    kind: 'update',
    ...clean,
    baseUpdatedAt: server.updatedAt,
    editedAt: now,
    conflict: null,
  }
  return { pending: [...pending, change], id }
}

/** Помечает стихотворение на удаление; новое, ещё не отправленное, просто выбрасывает из очереди */
export function recordDelete(
  pending: PendingChange[],
  serverPoems: ReaderPoem[],
  id: string,
  now: string = new Date().toISOString(),
): PendingChange[] {
  const existing = pending.find((change) => change.id === id)

  if (existing?.kind === 'create') {
    return pending.filter((change) => change.id !== id)
  }
  if (existing) {
    return pending.map((change) => (change.id === id ? { ...change, kind: 'delete', editedAt: now } : change))
  }

  const server = serverPoems.find((poem) => poem.id === id)
  if (!server) {
    return pending
  }
  const change: PendingChange = {
    id,
    kind: 'delete',
    title: server.title,
    text: server.text,
    published: server.published,
    baseUpdatedAt: server.updatedAt,
    editedAt: now,
    conflict: null,
  }
  return [...pending, change]
}

/** Выбрасывает правку из очереди: «взять с сайта» при конфликте и «вернуть» удалённое */
export function discardPending(pending: PendingChange[], id: string): PendingChange[] {
  return pending.filter((change) => change.id !== id)
}

/** Конфликт: «оставить мою» — правка уйдёт поверх версии, которая сейчас на сайте */
export function keepMine(pending: PendingChange[], id: string): PendingChange[] {
  return pending.map((change) =>
    change.id === id && change.conflict
      ? { ...change, baseUpdatedAt: change.conflict.updatedAt, conflict: null }
      : change
  )
}

/** Переводит очередь в формат запроса; правки с неразрешённым конфликтом не отправляются */
export function toWireChanges(pending: PendingChange[]): WireChange[] {
  return pending.flatMap((change): WireChange[] => {
    if (change.conflict) {
      return []
    }
    if (change.kind === 'delete') {
      return [{ kind: 'delete', id: change.id }]
    }
    const draft = { title: change.title, text: change.text, published: change.published }
    if (change.kind === 'create' || change.baseUpdatedAt === null) {
      return [{ kind: 'create', id: change.id, ...draft }]
    }
    return [{ kind: 'update', id: change.id, ...draft, baseUpdatedAt: change.baseUpdatedAt }]
  })
}

/**
 * Применяет итоги отправки к ТЕКУЩЕЙ очереди (за время запроса её могли изменить).
 * `idMap` — какие локальные id получили серверные: по нему переносят открытый стих.
 */
export function applySyncResults(
  pending: PendingChange[],
  sent: Record<string, string>,
  results: ChangeResult[],
): { pending: PendingChange[]; idMap: Record<string, string> } {
  const idMap: Record<string, string> = {}
  let next = pending

  for (const result of results) {
    const change = next.find((item) => item.id === result.id)
    if (!change) {
      continue
    }

    if (result.status === 'ok') {
      if (result.poem && result.poem.id !== change.id) {
        idMap[change.id] = result.poem.id
      }
      const editedWhileSending = change.kind !== 'delete' && sent[change.id] !== change.editedAt
      if (editedWhileSending && result.poem) {
        // стих правили, пока шёл запрос: оставляем правку, но от свежей серверной версии
        next = next.map((item) =>
          item === change
            ? { ...change, id: result.poem!.id, kind: 'update', baseUpdatedAt: result.poem!.updatedAt, conflict: null }
            : item
        )
      } else {
        next = next.filter((item) => item !== change)
      }
    } else if (result.status === 'conflict') {
      const server = result.server
      next = next.map((item) =>
        item === change
          ? {
            ...change,
            conflict: server
              ? { title: server.title, text: server.text, published: server.published, updatedAt: server.updatedAt }
              : null,
          }
          : item
      )
    } else if (result.status === 'missing') {
      // на сайте стиха уже нет: удаление выполнено, а правку превращаем в новое стихотворение
      next = change.kind === 'delete'
        ? next.filter((item) => item !== change)
        : next.map((item) => (item === change ? { ...change, kind: 'create', baseUpdatedAt: null } : item))
    }
    // invalid / error — правка остаётся в очереди для следующей попытки
  }

  return { pending: next, idMap }
}

// ───────────────────────── Обмен с сервером ─────────────────────────

/**
 * Отправляет очередь правок и забирает свежие стихи. Без сети или без входа возвращает статус,
 * а локальную копию не трогает. Очередь здесь НЕ меняется — это делает вызывающий код через
 * `applySyncResults` над актуальной очередью.
 */
export async function syncSnapshot(pending: PendingChange[] = []): Promise<SyncResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { status: 'offline' }
  }

  const sent: Record<string, string> = {}
  for (const change of pending) {
    if (!change.conflict) {
      sent[change.id] = change.editedAt
    }
  }

  try {
    const response = await fetch('/api/poet/poems', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes: toWireChanges(pending) }),
    })

    if (response.status === 401) {
      return { status: 'unauthorized' }
    }
    if (!response.ok) {
      return { status: 'error' }
    }

    const parsed = parseSyncResponse(await response.json())
    if (!parsed) {
      return { status: 'error' }
    }

    saveSnapshot(parsed.snapshot)
    return { status: 'ok', snapshot: parsed.snapshot, results: parsed.results, sent }
  } catch {
    // fetch бросает TypeError, когда сети нет, хотя navigator.onLine ещё говорит «да»
    return { status: 'offline' }
  }
}

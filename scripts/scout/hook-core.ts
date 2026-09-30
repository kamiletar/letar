import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import {
  Bm25,
  buildIndex,
  collectCards,
  embedTexts,
  formatBrief,
  formatOneLine,
  formatQuery,
  type FormRanking,
  formRanking,
  fuseWithDense,
  layoutHits,
  phraseRanking,
  type ScoutIndex,
  type ScoutResult,
} from '../../libs/scout/src/index'
import { loadIndex, saveIndex, sourcesMtime } from './index-store'
import { loadPhraseStore, type PhraseStore } from './phrases'
import { EMBED_URL, loadVectorStore, type VectorStore } from './vectors'

/** Режим доставки: `shadow` — только лог, `on` — справка всем, `ab` — половине сессий по хешу id */
export type ScoutMode = 'shadow' | 'on' | 'ab'

export interface HookPayload {
  session_id?: string
  prompt?: string
  cwd?: string
  transcript_path?: string
}

export interface SessionState {
  attempts: number
  briefed: boolean
}

/** Сколько содержательных сообщений ждём, прежде чем сдаться на сессию */
export const MAX_ATTEMPTS = 3
/** Короче — «продолжай», «?», «да»: задачи в таком сообщении нет */
export const MIN_PROMPT_CHARS = 15

const SERVICE_PREFIXES = [
  '<task-notification>',
  '<system-reminder>',
  'This session is being continued',
  '[Request interrupted',
]

export type Decision =
  | { action: 'run'; query: string }
  | { action: 'skip'; reason: 'briefed' | 'exhausted' | 'service' | 'short' | 'no-args'; countsAttempt: boolean }

/** Нужна ли справка на это сообщение и по какому тексту искать */
export function decide(prompt: string, state: SessionState): Decision {
  if (state.briefed) {
    return { action: 'skip', reason: 'briefed', countsAttempt: false }
  }
  if (state.attempts >= MAX_ATTEMPTS) {
    return { action: 'skip', reason: 'exhausted', countsAttempt: false }
  }
  const text = prompt.trim()
  if (SERVICE_PREFIXES.some((p) => text.startsWith(p))) {
    return { action: 'skip', reason: 'service', countsAttempt: false }
  }
  // `/app задача` — задача в аргументах; голая команда без аргументов задачи не несёт
  const command = text.match(/^\/([\w:-]+)\s*([\s\S]*)$/)
  const query = command ? command[2].trim() : text
  if (command && !query) {
    return { action: 'skip', reason: 'no-args', countsAttempt: false }
  }
  if (query.length < MIN_PROMPT_CHARS) {
    return { action: 'skip', reason: 'short', countsAttempt: true }
  }
  return { action: 'run', query: command ? `/${command[1]} ${query}` : query }
}

/** Группа A/B стабильна для сессии: A — справку видит агент, B — контроль */
export function abGroup(sessionId: string): 'A' | 'B' {
  return createHash('sha1').update(sessionId).digest()[0] % 2 === 0 ? 'A' : 'B'
}

export function readMode(home: string): ScoutMode {
  const env = process.env.SCOUT_MODE
  if (env === 'on' || env === 'ab' || env === 'shadow') {
    return env
  }
  try {
    const config = JSON.parse(readFileSync(join(home, 'config.json'), 'utf8')) as { mode?: string }
    if (config.mode === 'on' || config.mode === 'ab') {
      return config.mode
    }
  } catch {
    // нет конфига — теневой режим
  }
  return 'shadow'
}

function statePath(home: string, sessionId: string): string {
  return join(home, 'state', `${sessionId.replace(/[^\w-]/g, '_')}.json`)
}

export function readState(home: string, sessionId: string): SessionState {
  try {
    return JSON.parse(readFileSync(statePath(home, sessionId), 'utf8')) as SessionState
  } catch {
    return { attempts: 0, briefed: false }
  }
}

const DAY_MS = 24 * 60 * 60 * 1000
/** Маркеры состояний сессий живут две недели */
const STATE_TTL_MS = 14 * DAY_MS

/** Не чаще раза в сутки удаляет `state/*.json` старше двух недель; ошибки глотает */
function cleanupState(dir: string): void {
  try {
    const marker = join(dir, '.cleanup')
    if (existsSync(marker) && Date.now() - statSync(marker).mtimeMs < DAY_MS) {
      return
    }
    writeFileSync(marker, '')
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.json')) {
        continue
      }
      try {
        if (Date.now() - statSync(join(dir, name)).mtimeMs > STATE_TTL_MS) {
          rmSync(join(dir, name), { force: true })
        }
      } catch {
        // файл ушёл между readdir и stat
      }
    }
  } catch {
    // чистка — удобство, не повод падать
  }
}

function writeState(home: string, sessionId: string, state: SessionState): void {
  const dir = join(home, 'state')
  mkdirSync(dir, { recursive: true })
  writeFileSync(statePath(home, sessionId), JSON.stringify(state))
  cleanupState(dir)
}

/** Свежий индекс: пересобирается на месте, если доки новее (≈0,3 с), иначе читается с диска */
export function freshIndex(root: string, home: string): ScoutIndex {
  const current = loadIndex(home, root)
  if (current && Date.parse(current.builtAt) >= sourcesMtime(root)) {
    return current
  }
  const index = buildIndex(collectCards(root))
  saveIndex(index, home, root)
  return index
}

export interface HookRun {
  /** JSON для stdout харнесса; `undefined` — молчим */
  output?: Record<string, unknown>
  log?: Record<string, unknown>
}

export interface HookDeps {
  embedUrl?: string
  /** Сколько ждать эмбеддинг запроса; дольше — полка форм по BM25 */
  embedTimeoutMs?: number
  /** Заранее загруженные векторы: `null` — «векторов нет», `undefined` — загрузить `loadVectorStore(home)` */
  store?: VectorStore | null
  /** Векторы формулировок к докам: та же семантика `null`/`undefined`, что у `store` */
  phrases?: PhraseStore | null
}

/**
 * Сколько ждать эмбеддинг запроса. Бюджет хука 2,5 с, остальное занимает ≈0,2 с;
 * после простоя первый ответ эмбеддера дольше 800 мс.
 */
export const EMBED_TIMEOUT_MS = 1500

/** Не чаще раза в 10 минут просим фоновый пересчёт: маркер `state/refresh-requested` (по mtime) */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000

/**
 * Запустить `warmup.ts` отсоединённым процессом и сразу вернуться (индекс, прогрев эмбеддера, досчёт векторов).
 * `force` — игнорировать маркер (прогрев на старте сессии).
 */
export function requestVectorRefresh(root: string, home: string, options: { force?: boolean } = {}): void {
  try {
    const marker = join(home, 'state', 'refresh-requested')
    if (!options.force && existsSync(marker) && Date.now() - statSync(marker).mtimeMs < REFRESH_INTERVAL_MS) {
      return
    }
    mkdirSync(join(home, 'state'), { recursive: true })
    writeFileSync(marker, '')
    spawn(process.execPath, [join(root, 'scripts/scout/warmup.ts')], {
      cwd: root,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, SCOUT_HOME: home },
    }).unref()
  } catch {
    // фоновое обновление — удобство, хук от него не зависит
  }
}

/** Как построена полка форм: по эмбеддингам или откатом на BM25 и почему */
export type FormsSource = 'dense' | 'no-vectors' | 'embed-down' | 'stale-vectors'

/**
 * Вектор запроса и косинусный рейтинг полей и паттернов. На полке форм эмбеддинги дают +20 п.п.
 * полноты (замер в local-scout.md); на доках гибрид с BM25 помогает только по неупомянутым в запросе.
 */
async function denseForms(
  engine: Bm25,
  home: string,
  query: string,
  deps: HookDeps,
  root?: string,
): Promise<{ ranking?: FormRanking; source: FormsSource; vector?: Float32Array; store?: VectorStore }> {
  const store = deps.store === undefined ? loadVectorStore(home) : deps.store ?? undefined
  if (!store) {
    return { source: 'no-vectors' }
  }
  // Векторы должны соответствовать текстам карточек полки; иначе ранжирование по ним врёт
  const stale = engine.cards.some((c) =>
    (c.kind === 'field' || c.kind === 'pattern') && store.hashById.get(c.id) !== c.embedHash
  )
  if (stale) {
    if (root) {
      requestVectorRefresh(root, home)
    }
    return { source: 'stale-vectors' }
  }
  const dense = store.dense
  try {
    const [vector] = await embedTexts([formatQuery(query)], {
      url: deps.embedUrl ?? EMBED_URL,
      timeoutMs: deps.embedTimeoutMs ?? EMBED_TIMEOUT_MS,
    })
    return { ranking: formRanking(engine.cards, dense, vector), source: 'dense', vector, store }
  } catch {
    return { source: 'embed-down' }
  }
}

export interface ScoutQueryResult {
  result: ScoutResult
  forms: FormsSource
  /** Чем построены доки и ловушки: гибридом BM25 + эмбеддинги (+ формулировки к докам) или одним BM25 */
  docsSource: 'hybrid+phrases' | 'hybrid' | 'bm25'
  ms: number
}

/** Боевой путь поиска: рейтинг полки форм по эмбеддингам и раскладка справки. Его же гоняют бенч и CLI */
export async function scoutQuery(
  engine: Bm25,
  home: string,
  query: string,
  deps: HookDeps = {},
  root?: string,
): Promise<ScoutQueryResult> {
  const started = performance.now()
  const forms = await denseForms(engine, home, query, deps, root)
  // Карточки инструментов короткие и набирают меньше очков, чем доки, поэтому выдачу берём глубоко
  const bm25 = engine.search(query, 500)
  // Поля, паттерн и инструмент — по BM25-раскладке: их пороги подобраны под неё
  const base = layoutHits(engine.cards, bm25, query, { forms: forms.ranking })
  if (!forms.vector || !forms.store) {
    return { result: base, forms: forms.source, docsSource: 'bm25', ms: performance.now() - started }
  }
  // Доки и ловушки — по слиянию с плотным поиском (RRF); формулировки к докам — третий список
  // `SCOUT_NO_PHRASES=1` — хук без формулировок (для сравнения в бенче)
  const noPhrases = process.env.SCOUT_NO_PHRASES === '1'
  const phrases = noPhrases ? undefined : deps.phrases === undefined ? loadPhraseStore(home) : deps.phrases ?? undefined
  const extra = phrases
    ? [phraseRanking(engine.cards, phrases.index, forms.store.dense, forms.vector)]
    : undefined
  const fused = fuseWithDense(engine.cards, bm25, forms.store.dense, forms.vector, { extra })
  const docs = layoutHits(engine.cards, fused, query, { forms: forms.ranking })
  return {
    result: { ...base, docs: docs.docs, traps: docs.traps },
    forms: forms.source,
    docsSource: phrases ? 'hybrid+phrases' : 'hybrid',
    ms: performance.now() - started,
  }
}

/** Один вызов UserPromptSubmit: решение, поиск, лог, вывод по режиму */
export async function runScoutHook(
  payload: HookPayload,
  root: string,
  home: string,
  deps: HookDeps = {},
): Promise<HookRun> {
  const started = performance.now()
  const sessionId = payload.session_id ?? 'unknown'
  const state = readState(home, sessionId)
  const decision = decide(payload.prompt ?? '', state)
  if (decision.action === 'skip') {
    if (decision.countsAttempt) {
      writeState(home, sessionId, { ...state, attempts: state.attempts + 1 })
    }
    return {}
  }
  const engine = new Bm25(freshIndex(root, home))
  const { result, forms, docsSource } = await scoutQuery(engine, home, decision.query, deps, root)
  const brief = formatBrief(result)
  const line = formatOneLine(result)
  writeState(home, sessionId, { attempts: state.attempts + 1, briefed: Boolean(brief) })
  const mode = readMode(home)
  const group = abGroup(sessionId)
  const shown = Boolean(brief) && (mode === 'on' || (mode === 'ab' && group === 'A'))
  const log = {
    ts: new Date().toISOString(),
    sessionId,
    mode,
    group,
    shown,
    attempt: state.attempts + 1,
    query: decision.query.slice(0, 600),
    docs: result.docs.map((d) => `${d.path}:${d.line}`),
    traps: result.traps.map((d) => `${d.path}:${d.line}`),
    tool: result.tool ? `${result.tool.kind}:${result.tool.name}` : undefined,
    fields: result.fields.map((f) => f.name),
    pattern: result.pattern?.name,
    forms,
    docs_by: docsSource,
    scores: [...result.docs, ...result.traps].map((d) => Math.round(d.score * 10) / 10),
    chars: brief.length,
    ms: Math.round(performance.now() - started),
  }
  const output = shown
    ? {
      systemMessage: line,
      hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: brief },
    }
    : undefined
  return { output, log }
}

/** Лог больше этого размера уходит в архив с отметкой времени */
export const LOG_MAX_BYTES = 5 * 1024 * 1024

function fileStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${
    p(d.getSeconds())
  }`
}

export function appendLog(
  home: string,
  log: Record<string, unknown>,
  file = 'briefs.jsonl',
  maxBytes = LOG_MAX_BYTES,
): void {
  const dir = join(home, 'logs')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const path = join(dir, file)
  try {
    if (existsSync(path) && statSync(path).size > maxBytes) {
      const dot = file.lastIndexOf('.')
      const base = dot === -1 ? file : file.slice(0, dot)
      const ext = dot === -1 ? '' : file.slice(dot)
      renameSync(path, join(dir, `${base}-${fileStamp()}${ext}`))
    }
  } catch {
    // не удалось ротировать — пишем в тот же файл
  }
  appendFileSync(path, `${JSON.stringify(log)}\n`)
}

import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  Bm25,
  buildIndex,
  collectCards,
  formatBrief,
  formatOneLine,
  scout,
  type ScoutIndex,
} from '../../libs/scout/src/index'
import { loadIndex, saveIndex, sourcesMtime } from './index-store'

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

function writeState(home: string, sessionId: string, state: SessionState): void {
  mkdirSync(join(home, 'state'), { recursive: true })
  writeFileSync(statePath(home, sessionId), JSON.stringify(state))
}

/** Свежий индекс: пересобирается на месте, если доки новее (≈0,3 с), иначе читается с диска */
export function freshIndex(root: string, home: string): ScoutIndex {
  const current = loadIndex(home)
  if (current && Date.parse(current.builtAt) >= sourcesMtime(root)) {
    return current
  }
  const index = buildIndex(collectCards(root))
  saveIndex(index, home)
  return index
}

export interface HookRun {
  /** JSON для stdout харнесса; `undefined` — молчим */
  output?: Record<string, unknown>
  log?: Record<string, unknown>
}

/** Один вызов UserPromptSubmit: решение, поиск, лог, вывод по режиму */
export function runScoutHook(payload: HookPayload, root: string, home: string): HookRun {
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
  const index = freshIndex(root, home)
  const result = scout(new Bm25(index), decision.query)
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

export function appendLog(home: string, log: Record<string, unknown>): void {
  const dir = join(home, 'logs')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  appendFileSync(join(dir, 'briefs.jsonl'), `${JSON.stringify(log)}\n`)
}

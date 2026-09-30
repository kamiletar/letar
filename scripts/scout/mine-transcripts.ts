#!/usr/bin/env bun
/**
 * Разбор транскриптов Claude Code в сырьё для проверочного набора скаута.
 *
 * На каждую главную сессию (сайдчейны и субагенты пропускаются) — одна строка JSONL:
 * задача (первое содержательное сообщение человека), какие доки и правила агент прочитал
 * и когда (до первой правки или после), какие скилы, субагенты и команды звал,
 * последующие реплики человека (сырьё для разметки поправок) и прерывания.
 *
 * ⚠️ Разбор только через JSON.parse: в путях Windows `\\`, regex по сырой строке молча даёт 0.
 *
 * Запуск: bun scripts/scout/mine-transcripts.ts [--dir <каталог jsonl>] [--out <файл>] [--since 2026-08-10]
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { scoutDataDir } from './paths'

interface DocRead {
  path: string
  /** Порядковый номер вызова инструмента в сессии */
  step: number
  /** Прочитан до первой правки файла — значит, нужен был для решения задачи */
  beforeEdit: boolean
}

export interface SessionRecord {
  sessionId: string
  startedAt: string
  cwd: string
  entrypoint?: string
  /** Команда, которой открыта сессия (`/aboi`), если была */
  command?: string
  task: string
  docsRead: DocRead[]
  skills: string[]
  agents: string[]
  commands: string[]
  /** Реплики человека после первой — сырьё для разметки поправок */
  followups: string[]
  interrupts: number
  toolCalls: number
  firstEditStep?: number
}

/** Служебные вставки харнесса, которые приходят как сообщение пользователя */
const NOT_A_TASK_PREFIXES = [
  '<task-notification>',
  '<system-reminder>',
  '[Request interrupted',
  'This session is being continued',
  'Base directory for this skill',
  '<local-command',
  'Caveat:',
]

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const FOLLOWUP_LIMIT = 12
const FOLLOWUP_CHARS = 400
const TASK_CHARS = 3000

const KNOWLEDGE_PATH_RE = /(?:^|\/)(\.claude\/(?:docs|rules)\/[^?#]+\.md)$/
const COMMAND_NAME_RE = /<command-name>\/?([^<]+)<\/command-name>/
const COMMAND_ARGS_RE = /<command-args>([\s\S]*?)<\/command-args>/

/** Путь к доку или правилу от корня репо; worktree и абсолютные пути сводятся к одному виду */
export function normalizeKnowledgePath(raw: string): string | undefined {
  const match = raw.replace(/\\/g, '/').match(KNOWLEDGE_PATH_RE)
  if (!match || match[1].includes('/private/')) {
    return undefined
  }
  return match[1]
}

/** Текст сообщения человека: строка или текстовые блоки */
function messageText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type: string; text: string } => b?.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n')
  }
  return ''
}

interface ParsedHuman {
  text: string
  command?: string
}

/** Сообщение человека → задача; `undefined`, если это служебная вставка */
export function parseHumanText(raw: string): ParsedHuman | undefined {
  const text = raw.trim()
  if (!text) {
    return undefined
  }
  const name = text.match(COMMAND_NAME_RE)?.[1]?.trim()
  if (name) {
    const args = text.match(COMMAND_ARGS_RE)?.[1]?.trim() ?? ''
    return { text: args, command: name }
  }
  if (text.startsWith('<command-message>') || NOT_A_TASK_PREFIXES.some((p) => text.startsWith(p))) {
    return undefined
  }
  return { text }
}

// oxlint-disable-next-line no-explicit-any -- запись транскрипта: схема харнесса, не наша
type Row = any

function isHuman(row: Row): boolean {
  if (row.type !== 'user' || row.isMeta || row.isCompactSummary || row.isSidechain || row.toolUseResult) {
    return false
  }
  if (row.origin) {
    return row.origin.kind === 'human'
  }
  return row.userType === 'external'
}

function emptyRecord(): SessionRecord {
  return {
    sessionId: '',
    startedAt: '',
    cwd: '',
    task: '',
    docsRead: [],
    skills: [],
    agents: [],
    commands: [],
    followups: [],
    interrupts: 0,
    toolCalls: 0,
  }
}

export async function mineSession(file: string): Promise<SessionRecord | undefined> {
  const rl = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity })
  const rec = emptyRecord()
  let taskFound = false
  for await (const line of rl) {
    // Быстрый отсев вложений и снимков: они крупные и нам не нужны
    if (!line.includes('"type":"user"') && !line.includes('"type":"assistant"')) {
      continue
    }
    let row: Row
    try {
      row = JSON.parse(line)
    } catch {
      continue
    }
    if (row.isSidechain) {
      continue
    }
    if (row.type === 'user') {
      if (!isHuman(row)) {
        continue
      }
      const raw = messageText(row.message?.content)
      if (raw.includes('[Request interrupted')) {
        rec.interrupts++
      }
      const human = parseHumanText(raw)
      if (!human) {
        continue
      }
      if (human.command) {
        rec.commands.push(human.command)
      }
      if (!taskFound && (human.text || human.command)) {
        taskFound = true
        rec.sessionId = row.sessionId ?? ''
        rec.startedAt = row.timestamp ?? ''
        rec.cwd = row.cwd ?? ''
        rec.entrypoint = row.entrypoint
        rec.command = human.command
        rec.task = human.text.slice(0, TASK_CHARS)
      } else if (taskFound && human.text && rec.followups.length < FOLLOWUP_LIMIT) {
        rec.followups.push(human.text.slice(0, FOLLOWUP_CHARS))
      }
      continue
    }
    const blocks = row.message?.content
    if (!Array.isArray(blocks)) {
      continue
    }
    for (const block of blocks) {
      if (block?.type !== 'tool_use') {
        continue
      }
      rec.toolCalls++
      const input = block.input ?? {}
      if (EDIT_TOOLS.has(block.name)) {
        rec.firstEditStep ??= rec.toolCalls
      } else if (block.name === 'Read' && typeof input.file_path === 'string') {
        const path = normalizeKnowledgePath(input.file_path)
        if (path && !rec.docsRead.some((d) => d.path === path)) {
          rec.docsRead.push({ path, step: rec.toolCalls, beforeEdit: rec.firstEditStep === undefined })
        }
      } else if (block.name === 'Skill' && typeof input.skill === 'string') {
        rec.skills.push(input.skill)
      } else if ((block.name === 'Agent' || block.name === 'Task') && typeof input.subagent_type === 'string') {
        rec.agents.push(input.subagent_type)
      }
    }
  }
  return taskFound ? rec : undefined
}

function parseArgs(argv: string[]): { dir: string; out: string; since?: string } {
  const get = (flag: string) => {
    const i = argv.indexOf(flag)
    return i === -1 ? undefined : argv[i + 1]
  }
  const projectSlug = process.cwd().replace(/[:\\/]/g, '-')
  return {
    dir: get('--dir') ?? join(homedir(), '.claude', 'projects', projectSlug),
    out: get('--out') ?? join(scoutDataDir(), 'sessions.jsonl'),
    since: get('--since'),
  }
}

async function main() {
  const { dir, out, since } = parseArgs(process.argv.slice(2))
  if (!existsSync(dir)) {
    console.error(`Нет каталога транскриптов: ${dir}`)
    process.exit(1)
  }
  const sinceMs = since ? Date.parse(since) : 0
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => join(dir, f))
    .filter((f) => statSync(f).mtimeMs >= sinceMs)
  const started = performance.now()
  const records: SessionRecord[] = []
  for (const [i, file] of files.entries()) {
    const rec = await mineSession(file)
    if (rec) {
      records.push(rec)
    }
    if ((i + 1) % 200 === 0) {
      console.error(`… ${i + 1}/${files.length}, ${Math.round((performance.now() - started) / 1000)} с`)
    }
  }
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, records.map((r) => JSON.stringify(r)).join('\n') + '\n')
  const withDocs = records.filter((r) => r.docsRead.some((d) => d.beforeEdit)).length
  console.log(
    `Сессий: ${records.length} из ${files.length} файлов; с доками до первой правки: ${withDocs}; `
      + `${Math.round((performance.now() - started) / 1000)} с → ${out}`,
  )
}

if (import.meta.main) {
  await main()
}

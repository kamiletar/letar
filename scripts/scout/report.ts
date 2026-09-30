#!/usr/bin/env bun
/**
 * Отчёт по живым сессиям: открыл ли агент то, что скаут подсказал, и что прочёл сверх подсказки.
 *
 * Склеивает лог справок хука (`SCOUT_HOME/logs/briefs*.jsonl`) с транскриптами сессий.
 * В теневом режиме «открыл подсказанное» = «открыл бы и без подсказки» — базовая линия для A/B.
 * Разбор транскрипта — только `mineSession` из `mine-transcripts.ts`.
 *
 * Запуск: bun scripts/scout/report.ts [--since 2026-09-30] [--projects <каталог>] [--show 10]
 *
 * ⚠️ Текст запросов печатается только с `--show` (локальный отчёт владельцу); в JSON его нет.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mentionedIn } from '../../libs/scout/src/index'
import { arg } from './cli'
import { mineSession } from './mine-transcripts'
import { scoutHome } from './paths'

/** Транскрипт, изменённый позже этого срока назад, считается сессией «в работе» */
export const ACTIVE_WINDOW_MS = 30 * 60 * 1000

/** Строка лога справок (поля — из `runScoutHook`); всё, кроме sessionId, может отсутствовать */
export interface BriefRow {
  sessionId: string
  ts?: string
  mode?: string
  group?: string
  shown?: boolean
  query?: string
  docs?: string[]
  traps?: string[]
  tool?: string
}

export type SessionStatus = 'ok' | 'no-transcript' | 'in-progress'

export interface SessionReport {
  sessionId: string
  status: SessionStatus
  mode: string
  shown: boolean
  queryLength: number
  suggested: string[]
  opened: string[]
  openedNovel: string[]
  hits: string[]
  hitsBeforeEdit: string[]
  missed: string[]
  tool?: string
  toolHit?: boolean
}

export interface GroupSummary {
  group: string
  sessions: number
  withBrief: number
  precision?: number
  recall?: number
  beforeEdit?: number
  toolRate?: number
  medianQueryLength: number
}

/** sessionId ручной пробы хука, не живой сессии */
export const isProbe = (sessionId: string) => sessionId.startsWith('probe-')

const stripLine = (ref: string) => ref.replace(/:\d+$/, '')

function median(values: number[]): number {
  if (!values.length) {
    return 0
  }
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const ratio = (num: number, den: number) => (den ? num / den : undefined)

/** Все строки логов: основной `briefs.jsonl` и ротированные `briefs-*.jsonl`; битые строки пропускаются */
export function readBriefRows(logsDir: string): BriefRow[] {
  if (!existsSync(logsDir)) {
    return []
  }
  const rows: BriefRow[] = []
  for (const name of readdirSync(logsDir).filter((f) => /^briefs(-.*)?\.jsonl$/.test(f)).sort()) {
    for (const line of readFileSync(join(logsDir, name), 'utf8').split('\n')) {
      if (!line.trim()) {
        continue
      }
      try {
        const row = JSON.parse(line) as BriefRow
        if (row.sessionId) {
          rows.push(row)
        }
      } catch {
        // битая строка — пропускаем
      }
    }
  }
  return rows
}

const hasBrief = (r: BriefRow) => Boolean(r.docs?.length || r.traps?.length || r.tool)

/** Одна строка на сессию: первая со справкой, иначе первая («скаут промолчал») */
export function pickRows(rows: BriefRow[], sinceMs = 0): BriefRow[] {
  const bySession = new Map<string, BriefRow>()
  for (const row of rows) {
    if (sinceMs && Date.parse(row.ts ?? '') < sinceMs) {
      continue
    }
    const prev = bySession.get(row.sessionId)
    if (!prev || (!hasBrief(prev) && hasBrief(row))) {
      bySession.set(row.sessionId, row)
    }
  }
  return [...bySession.values()]
}

/** `<projects>/<любой каталог>/<sessionId>.jsonl` → карта sessionId → файл */
export function indexTranscripts(projectsDir: string): Map<string, string> {
  const map = new Map<string, string>()
  if (!existsSync(projectsDir)) {
    return map
  }
  for (const dir of readdirSync(projectsDir)) {
    const full = join(projectsDir, dir)
    try {
      if (!statSync(full).isDirectory()) {
        continue
      }
      for (const f of readdirSync(full)) {
        if (f.endsWith('.jsonl')) {
          map.set(f.slice(0, -'.jsonl'.length), join(full, f))
        }
      }
    } catch {
      // каталог исчез или недоступен
    }
  }
  return map
}

export async function reportSession(row: BriefRow, file: string | undefined, now = Date.now()): Promise<SessionReport> {
  const query = row.query ?? ''
  const suggested = [...new Set([...(row.docs ?? []), ...(row.traps ?? [])].map(stripLine))]
  const base: SessionReport = {
    sessionId: row.sessionId,
    status: 'ok',
    mode: row.mode ?? 'unknown',
    shown: Boolean(row.shown),
    queryLength: query.length,
    suggested,
    opened: [],
    openedNovel: [],
    hits: [],
    hitsBeforeEdit: [],
    missed: [],
    tool: row.tool,
  }
  if (!file) {
    return { ...base, status: 'no-transcript' }
  }
  if (now - statSync(file).mtimeMs < ACTIVE_WINDOW_MS) {
    return { ...base, status: 'in-progress' }
  }
  const rec = await mineSession(file)
  if (!rec) {
    return { ...base, status: 'no-transcript' }
  }
  const opened = rec.docsRead.map((d) => d.path)
  const openedNovel = opened.filter((p) => !mentionedIn(query, p))
  const suggestedSet = new Set(suggested)
  const used = new Set([...rec.skills, ...rec.agents, ...rec.commands])
  const toolName = row.tool?.slice(row.tool.indexOf(':') + 1)
  return {
    ...base,
    opened,
    openedNovel,
    hits: opened.filter((p) => suggestedSet.has(p)),
    hitsBeforeEdit: rec.docsRead.filter((d) => d.beforeEdit && suggestedSet.has(d.path)).map((d) => d.path),
    missed: openedNovel.filter((p) => !suggestedSet.has(p)),
    toolHit: toolName ? used.has(toolName) : undefined,
  }
}

/** Сводка по группам `(mode, shown)`; в метрики входят только сессии со статусом `ok` */
export function summarize(reports: SessionReport[]): GroupSummary[] {
  const groups = new Map<string, SessionReport[]>()
  for (const r of reports) {
    if (r.status !== 'ok') {
      continue
    }
    const key = `${r.mode}/${r.shown ? 'показана' : 'тень'}`
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return [...groups.entries()].map(([group, list]) => {
    const sum = (f: (r: SessionReport) => number) => list.reduce((acc, r) => acc + f(r), 0)
    const withTool = list.filter((r) => r.tool)
    const hitsNovel = sum((r) => r.hits.filter((p) => r.openedNovel.includes(p)).length)
    return {
      group,
      sessions: list.length,
      withBrief: list.filter((r) => r.suggested.length || r.tool).length,
      precision: ratio(sum((r) => r.hits.length), sum((r) => r.suggested.length)),
      recall: ratio(hitsNovel, sum((r) => r.openedNovel.length)),
      beforeEdit: ratio(sum((r) => r.hitsBeforeEdit.length), sum((r) => r.suggested.length)),
      toolRate: ratio(withTool.filter((r) => r.toolHit).length, withTool.length),
      medianQueryLength: median(list.map((r) => r.queryLength)),
    }
  })
}

const pct = (v?: number) => (v === undefined ? '—' : `${Math.round(v * 100)}%`)

async function main() {
  const since = arg('--since')
  const projects = arg('--projects') ?? join(homedir(), '.claude', 'projects')
  const show = Number(arg('--show') ?? 0)
  const home = scoutHome()
  const all = pickRows(readBriefRows(join(home, 'logs')), since ? Date.parse(since) : 0)
  // Пробы (ручные прогоны хука с выдуманным sessionId) — не живые сессии
  const rows = all.filter((r) => !isProbe(r.sessionId))
  const files = indexTranscripts(projects)
  const reports: SessionReport[] = []
  const queries = new Map<string, string>()
  for (const row of rows) {
    reports.push(await reportSession(row, files.get(row.sessionId)))
    queries.set(row.sessionId, row.query ?? '')
  }
  const summary = summarize(reports)
  const count = (s: SessionStatus) => reports.filter((r) => r.status === s).length
  console.log(
    `Сессий в логе: ${reports.length} (проб пропущено: ${all.length - rows.length}); разобрано: ${
      count('ok')
    }; в работе: ${count('in-progress')}; `
      + `транскрипт не найден: ${count('no-transcript')}`,
  )
  console.log('группа | сессий | со справкой | точность | полнота | до правки | инструмент | медиана запроса')
  for (const g of summary) {
    console.log(
      `${g.group} | ${g.sessions} | ${g.withBrief} | ${pct(g.precision)} | ${pct(g.recall)} | ${pct(g.beforeEdit)} | ${
        pct(g.toolRate)
      } | ${g.medianQueryLength}`,
    )
  }
  if (show > 0) {
    for (const r of reports.filter((x) => x.status === 'ok' && x.missed.length).slice(0, show)) {
      console.log(`\n# ${r.sessionId}\nзапрос: ${(queries.get(r.sessionId) ?? '').slice(0, 200)}`)
      console.log(`подсказано: ${r.suggested.join(', ') || '—'}\nпрочитано: ${r.opened.join(', ')}`)
    }
  }
  const outDir = join(home, 'reports')
  mkdirSync(outDir, { recursive: true })
  const out = join(outDir, `${new Date().toISOString().slice(0, 10)}.json`)
  writeFileSync(out, JSON.stringify({ since, summary, sessions: reports }, null, 2))
  console.log(`\nJSON → ${out}`)
}

if (import.meta.main) {
  await main()
}

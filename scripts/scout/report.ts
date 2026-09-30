#!/usr/bin/env bun
/**
 * Отчёт по живым сессиям: открыл ли агент то, что скаут подсказал, и что прочёл сверх подсказки.
 *
 * Склеивает лог справок хука (`SCOUT_HOME/logs/briefs*.jsonl`) с транскриптами сессий.
 * В теневом режиме «открыл подсказанное» = «открыл бы и без подсказки» — базовая линия для A/B.
 * Разбор транскрипта — только `mineSession` из `mine-transcripts.ts`.
 *
 * Запуск: bun scripts/scout/report.ts [--since 2026-09-30] [--projects <каталог>] [--show 10]
 *   [--judge [--sample 60]]   — онлайн-судья 9B по живым справкам (нужен llama-server на 8092)
 *
 * ⚠️ Текст запросов печатается только с `--show` (локальный отчёт владельцу); в JSON его нет.
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mentionedIn } from '../../libs/scout/src/index'
import { arg } from './cli'
import { loadIndex } from './index-store'
import { JUDGE_MODEL, type JudgeItem, judgeItems, type JudgeLabel, labelKey, loadLabels } from './judge'
import { mineSession } from './mine-transcripts'
import { scoutHome } from './paths'
import { abDifference, pickSample, wilson } from './report-stats'
import { canonicalTools } from './tool-names'

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
  /** `app` — справка приложения по голой `/<app>`; нет поля — справка поиска */
  kind?: 'app'
  /** Версия скаута (`INDEX_VERSION` + хеш кода) на момент справки; нет поля — запись до версионирования */
  scoutVersion?: string
}

export type SessionStatus = 'ok' | 'no-transcript' | 'in-progress'

export interface SessionReport {
  sessionId: string
  status: SessionStatus
  mode: string
  shown: boolean
  kind?: 'app'
  scoutVersion?: string
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
  /** Вид справки: поиск по сообщению или справка приложения по голой `/<app>` */
  kind: 'поиск' | 'app'
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

/** Одна строка на сессию и вид справки (`app` / поиск): первая со справкой, иначе первая («скаут промолчал») */
export function pickRows(rows: BriefRow[], sinceMs = 0): BriefRow[] {
  const bySession = new Map<string, BriefRow>()
  for (const row of rows) {
    if (sinceMs && Date.parse(row.ts ?? '') < sinceMs) {
      continue
    }
    const key = `${row.sessionId}|${row.kind ?? ''}`
    const prev = bySession.get(key)
    if (!prev || (!hasBrief(prev) && hasBrief(row))) {
      bySession.set(key, row)
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
    kind: row.kind,
    scoutVersion: row.scoutVersion,
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
  // У справки приложения запроса нет: новым считается всё прочитанное
  const openedNovel = row.kind === 'app' ? opened : opened.filter((p) => !mentionedIn(query, p))
  const suggestedSet = new Set(suggested)
  // История вызовов хранит старые имена (`infra:deploy`) — переводим в текущие
  const used = new Set(canonicalTools([...rec.skills, ...rec.agents, ...rec.commands]))
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

/** Сводка по группам `(mode, shown, kind)`; в метрики входят только сессии со статусом `ok` */
export function summarize(reports: SessionReport[]): GroupSummary[] {
  const groups = new Map<string, SessionReport[]>()
  for (const r of reports) {
    if (r.status !== 'ok') {
      continue
    }
    const key = `${r.mode}/${r.shown ? 'показана' : 'тень'}/${r.kind === 'app' ? 'app' : 'поиск'}`
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return [...groups.entries()].map(([key, list]) => {
    const [mode, shownLabel, kind] = key.split('/')
    const sum = (f: (r: SessionReport) => number) => list.reduce((acc, r) => acc + f(r), 0)
    const withTool = list.filter((r) => r.tool)
    const hitsNovel = sum((r) => r.hits.filter((p) => r.openedNovel.includes(p)).length)
    return {
      group: `${mode}/${shownLabel}`,
      kind: kind as GroupSummary['kind'],
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

/** Сколько справок (строк после `pickRows`) на каждую версию скаута; без поля — `без версии` */
export function versionBreakdown(rows: BriefRow[]): Array<{ version: string; count: number }> {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const v = r.scoutVersion ?? 'без версии'
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return [...counts.entries()].map(([version, count]) => ({ version, count })).sort((a, b) => b.count - a.count)
}

/**
 * Онлайн-судья: случайные N справок поиска, 9B размечает «по делу» первые 3 пункта (тот же промпт,
 * что в `judge.ts`). Метки кешируются в `SCOUT_HOME/judge-live-labels.jsonl`; в отчёт идут только
 * цифры. Доля считается по парам «справка — пункт» (Уилсон 95%): пары одной справки не независимы,
 * интервал оптимистичен.
 */
export async function judgeLive(rows: BriefRow[], home: string, sample: number) {
  const index = loadIndex(home, process.cwd())
  const byRef = new Map<string, JudgeItem>()
  for (const c of index?.cards ?? []) {
    byRef.set(`${c.path}:${c.line}`, { path: c.path, title: c.title, summary: c.summary })
  }
  const pool = rows.filter((r) => r.kind !== 'app' && r.query && r.docs?.length)
  const picked = pickSample(pool, sample, (r) => r.sessionId)
  const file = join(home, 'judge-live-labels.jsonl')
  const labels = loadLabels(file)
  let items = 0
  let relevant = 0
  let unjudged = 0
  for (const row of picked) {
    const top = (row.docs ?? []).slice(0, 3).map((ref) => byRef.get(ref)).filter((x): x is JudgeItem => Boolean(x))
    const missing = top.filter((it) => !labels.has(labelKey(row.sessionId, it.path)))
    if (missing.length) {
      const got = await judgeItems(row.query!, missing)
      if ('labels' in got) {
        missing.forEach((it, i) => {
          const l: JudgeLabel = { sessionId: row.sessionId, path: it.path, label: got.labels[i], judge: JUDGE_MODEL }
          labels.set(labelKey(l.sessionId, l.path), l)
          appendFileSync(file, JSON.stringify(l) + String.fromCharCode(10))
        })
      }
    }
    for (const it of top) {
      const l = labels.get(labelKey(row.sessionId, it.path))
      if (!l) {
        unjudged++
        continue
      }
      items++
      relevant += l.label >= 1 ? 1 : 0
    }
  }
  return { sessions: picked.length, items, relevant, ...wilson(relevant, items), unjudged }
}

const pct = (v?: number) => (v === undefined ? '—' : `${Math.round(v * 100)}%`)
const signed = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)} п.п.`

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
  console.log(`Версии скаута: ${versionBreakdown(rows).map((v) => `${v.version} ×${v.count}`).join(', ') || '—'}`)
  console.log('группа | вид | сессий | со справкой | точность | полнота | до правки | инструмент | медиана запроса')
  for (const g of summary) {
    console.log(
      `${g.group} | ${g.kind} | ${g.sessions} | ${g.withBrief} | ${pct(g.precision)} | ${pct(g.recall)} | ${
        pct(g.beforeEdit)
      } | ${pct(g.toolRate)} | ${g.medianQueryLength}`,
    )
  }
  const diff = abDifference(reports)
  if (reports.some((r) => r.mode === 'ab' && r.status === 'ok')) {
    console.log('\nразница A−B (режим ab, бутстрэп по сессиям, 95%):')
    for (const d of diff) {
      console.log(
        d.diff === undefined
          ? `${d.metric} | A ${pct(d.a)} | B ${pct(d.b)} | разница —`
          : `${d.metric} | A ${pct(d.a)} | B ${pct(d.b)} | A−B ${signed(d.diff)} [${signed(d.lo!)}; ${signed(d.hi!)}]`,
      )
    }
  }
  const versions = [...new Set(reports.map((r) => r.scoutVersion ?? 'без версии'))]
  if (versions.length > 1) {
    for (const v of versions) {
      console.log(`
[версия ${v}]`)
      for (const g of summarize(reports.filter((r) => (r.scoutVersion ?? 'без версии') === v))) {
        console.log(
          `${g.group} | ${g.kind} | ${g.sessions} | ${g.withBrief} | ${pct(g.precision)} | ${pct(g.recall)} | ${
            pct(g.beforeEdit)
          } | ${pct(g.toolRate)} | ${g.medianQueryLength}`,
        )
      }
    }
  }
  if (process.argv.includes('--judge')) {
    const j = await judgeLive(rows, home, Number(arg('--sample') ?? 60))
    console.log(
      `\nсудья 9B, по делу@3: ${pct(j.p)} (95% Уилсон ${pct(j.lo)}–${
        pct(j.hi)
      }), пунктов ${j.items} из ${j.sessions} справок`
        + (j.unjudged ? `, не разобрано ${j.unjudged}` : ''),
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
  writeFileSync(out, JSON.stringify({ since, summary, abDiff: diff, sessions: reports }, null, 2))
  console.log(`\nJSON → ${out}`)
}

if (import.meta.main) {
  await main()
}

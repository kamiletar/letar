/**
 * Разбор лога деплоя для `deploy_status`: grep с контекстом, вырезка таблицы маршрутов Next.js
 * и бюджет размера ответа.
 *
 * Зачем: деплой приложения с s1-сборкой (BUILD_ON_S1_APPS, PLAN-INFRA-6.md §157) даёт лог из ~2000
 * строк (~258 тыс. символов у kami). Вызов `deploy_status({ sinceLine: 0 })` упирался в лимит
 * MCP-клиента («exceeds maximum allowed tokens»), а проверкам пилотов нужны считанные места:
 * таблица маршрутов, строки про туннель БД, ECONNREFUSED/P1001, «No pending migrations».
 *
 * Всё здесь — чистые функции без сети: тестируются напрямую и через настоящий `Client`.
 */

import { pretty } from '@letar/mcp-server-kit'

/**
 * Бюджет лога в одном ответе, символов. Клиент Claude Code отвергает ответ MCP-инструмента больше
 * ~25 тыс. токенов; лог с кириллицей и псевдографикой токенизируется хуже английского текста
 * (грубо 2–3 символа на токен), поэтому 30 тыс. символов — с запасом.
 */
export const LOG_BUDGET_CHARS = 30_000

/** Потолок длины одной строки: минифицированные ошибки бывают на десятки тысяч символов. */
export const LINE_MAX_CHARS = 600

/** Максимум строк контекста вокруг совпадения grep. */
export const CONTEXT_MAX = 10

/** Сколько строк после «Route (app)» ищем легенду, прежде чем считать блок оборванным. */
export const ROUTE_TABLE_MAX_LINES = 600

/** Строка лога со сквозным номером (как в `sinceLine`/`fromLine`, с учётом вытесненных агентом). */
export interface LogLine {
  n: number
  text: string
}

// ─── нормализация ────────────────────────────────────────────────────────────

// eslint-disable-next-line no-control-regex -- ESC-последовательности цвета терминала как раз и вычищаем
const ANSI_RE = /\[[0-9;?]*[A-Za-z]/g

/** Убирает ANSI-цвета и хвостовой `\r`: в ответе для чтения они только жгут токены. */
export function cleanLine(raw: string): string {
  return raw.replace(ANSI_RE, '').replace(/\r$/, '')
}

/** Обрезает слишком длинную строку с явной пометкой, сколько отброшено. */
export function clipLine(text: string, max = LINE_MAX_CHARS): string {
  return text.length > max ? `${text.slice(0, max)}… [+${text.length - max} симв.]` : text
}

/** Нумерует строки лога, начиная с `fromLine` (сквозной номер первой строки массива). */
export function numberLines(output: readonly string[], fromLine: number): LogLine[] {
  return output.map((raw, i) => ({ n: fromLine + i, text: cleanLine(raw) }))
}

// ─── бюджет размера ──────────────────────────────────────────────────────────

/**
 * Оставляет столько элементов, сколько влезает в бюджет: с начала (`head`) или с конца (`tail`).
 * Один элемент оставляется всегда — иначе непустой лог превратился бы в пустой ответ.
 */
export function fitToBudget<T>(
  items: readonly T[],
  cost: (item: T) => number,
  budget: number,
  keep: 'head' | 'tail',
): { kept: T[]; omitted: number } {
  const ordered = keep === 'head' ? items : [...items].reverse()
  const picked: T[] = []
  let used = 0
  for (const item of ordered) {
    const c = cost(item)
    if (picked.length > 0 && used + c > budget) {
      break
    }
    picked.push(item)
    used += c
  }
  if (keep === 'tail') {
    picked.reverse()
  }
  return { kept: picked, omitted: items.length - picked.length }
}

// ─── grep ────────────────────────────────────────────────────────────────────

export type LineMatcher = (text: string) => boolean

/**
 * Матчер строки: подстрока (по умолчанию) или регулярное выражение. Регистр не учитывается в обоих
 * режимах. Подстрока — умолчание намеренно: искомое часто содержит спецсимволы regex
 * (`/[locale]/blog/[slug]`), и как регулярка оно молча означало бы «один символ из l,o,c,a,e».
 * Некорректное регулярное выражение бросает `SyntaxError` — вызывающий проверяет заранее.
 */
export function buildMatcher(pattern: string, regex: boolean): LineMatcher {
  if (regex) {
    const re = new RegExp(pattern, 'i')
    return (text) => re.test(text)
  }
  const needle = pattern.toLowerCase()
  return (text) => text.toLowerCase().includes(needle)
}

export interface GrepRow {
  kind: 'match' | 'context' | 'gap'
  /** Сквозной номер строки; у `gap` нет. */
  n?: number
  text: string
}

/** Совпавшие строки лога плюс `context` строк вокруг; несмежные группы разделяет `gap`. */
export function grepLines(
  lines: readonly LogLine[],
  match: LineMatcher,
  context: number,
): { rows: GrepRow[]; matchCount: number } {
  const matched: number[] = []
  lines.forEach((line, i) => {
    if (match(line.text)) {
      matched.push(i)
    }
  })
  const matchedSet = new Set(matched)

  const rows: GrepRow[] = []
  let emittedTo = -1
  for (const i of matched) {
    const from = Math.max(i - context, emittedTo + 1)
    const to = Math.min(i + context, lines.length - 1)
    if (emittedTo >= 0 && from > emittedTo + 1) {
      rows.push({ kind: 'gap', text: '--' })
    }
    for (let k = from; k <= to; k++) {
      const line = lines[k] as LogLine
      rows.push({ kind: matchedSet.has(k) ? 'match' : 'context', n: line.n, text: line.text })
    }
    emittedTo = Math.max(emittedTo, to)
  }
  return { rows, matchCount: matched.length }
}

/** Формат grep -n: `NNN: совпадение`, `NNN- контекст`, `--` между несмежными группами. */
export function renderGrepRow(row: GrepRow, width: number): string {
  if (row.kind === 'gap') {
    return row.text
  }
  const sep = row.kind === 'match' ? ':' : '-'
  return `${String(row.n).padStart(width)}${sep} ${clipLine(row.text)}`
}

// ─── таблица маршрутов Next.js ───────────────────────────────────────────────

const ROUTE_HEADER_RE = /Route \((?:app|pages)\)/
const LEGEND_RE = /\((?:Static|SSG|ISR|Dynamic|Partial Prerender)\)/
// `#14 45.123 ` — префикс `docker build --progress=plain`; пустая строка бывает и с ним.
const BLANK_RE = /^(?:#\d+\s+[\d.]+)?\s*$/

export interface RouteTableBlock {
  /** Сквозные номера первой и последней строки блока. */
  fromLine: number
  toLine: number
  /** Строки блока без пустых — от «Route (app)» до легенды включительно. */
  lines: string[]
  /** false — легенды нет (лог оборван или вытеснен): блок может быть неполным. */
  complete: boolean
}

/**
 * Ищет блоки «Route (app)» … легенда `(Static)/(SSG)/(Dynamic)`. Блоков может быть несколько
 * (несколько сборок в одном логе). Префикс docker и ANSI не мешают: ищем подстроку, не начало.
 * Легенду берём целиком (её строки идут подряд) — по ней читаются значки ○/●/ƒ.
 */
export function findRouteTables(lines: readonly LogLine[]): RouteTableBlock[] {
  const isLegend = (idx: number): boolean => LEGEND_RE.test((lines[idx] as LogLine).text)
  const blocks: RouteTableBlock[] = []
  let i = 0
  while (i < lines.length) {
    if (!ROUTE_HEADER_RE.test((lines[i] as LogLine).text)) {
      i++
      continue
    }
    let j = i + 1
    while (j < lines.length && j - i <= ROUTE_TABLE_MAX_LINES && !isLegend(j)) {
      j++
    }
    const legendFound = j < lines.length && isLegend(j)
    let end = j // индекс первой строки после блока
    if (legendFound) {
      while (end < lines.length && isLegend(end)) {
        end++
      }
    }
    const slice = lines.slice(i, end)
    blocks.push({
      fromLine: (lines[i] as LogLine).n,
      toLine: (lines[end - 1] as LogLine).n,
      lines: slice.filter((l) => !BLANK_RE.test(l.text)).map((l) => l.text),
      complete: legendFound,
    })
    i = end
  }
  return blocks
}

export interface RouteEntry {
  route: string
  symbol: string
  /** Пути, перечисленные под маршрутом (`generateStaticParams`). */
  listed: number
  /** Число из «[+N more paths]»: Next перечисляет не все пути. */
  more: number
}

export interface RouteSummary {
  /** Сколько маршрутов с каждым значком: ○ static, ● SSG, ƒ dynamic, ◐ PPR. */
  bySymbol: Record<string, number>
  /** Параметрические маршруты (`[slug]`) и любые с перечисленными путями. */
  entries: RouteEntry[]
}

const TOP_ROUTE_RE = /^[┌├└]\s+(\S)\s+(\/\S*)/
const CHILD_PATH_RE = /^│?\s*[├└]\s+(\/\S*)/
const MORE_PATHS_RE = /^│?\s*[├└]\s+\[\+(\d+) more paths?\]/

/**
 * Сводка по блоку: сколько маршрутов каждого типа и, для параметрических, сколько путей
 * перечислено. Ответ на вопрос «● у `/[locale]/blog/[slug]` и сколько путей за ним» без чтения
 * таблицы глазами. Разбор терпим к префиксу docker: до первого символа рамки всё отбрасывается.
 */
export function summarizeRouteTable(blockLines: readonly string[]): RouteSummary {
  const bySymbol: Record<string, number> = {}
  const all: RouteEntry[] = []
  let current: RouteEntry | null = null

  for (const text of blockLines) {
    const boxAt = text.search(/[┌├└│]/)
    if (boxAt < 0) {
      continue
    }
    const body = text.slice(boxAt)
    const top = body.match(TOP_ROUTE_RE)
    if (top) {
      current = { route: top[2] as string, symbol: top[1] as string, listed: 0, more: 0 }
      all.push(current)
      bySymbol[current.symbol] = (bySymbol[current.symbol] ?? 0) + 1
      continue
    }
    if (!current) {
      continue
    }
    const more = body.match(MORE_PATHS_RE)
    if (more) {
      current.more += Number(more[1])
    } else if (CHILD_PATH_RE.test(body)) {
      current.listed++
    }
  }

  return {
    bySymbol,
    entries: all.filter((e) => e.route.includes('[') || e.listed > 0 || e.more > 0),
  }
}

const SYMBOL_LABEL: Record<string, string> = { '○': 'static', '●': 'SSG', ƒ: 'dynamic', '◐': 'PPR' }

/** Человекочитаемая сводка (см. `summarizeRouteTable`), по строке на маршрут. */
export function renderRouteSummary(summary: RouteSummary): string[] {
  const counts = Object.entries(summary.bySymbol)
    .map(([sym, n]) => `${sym} ${SYMBOL_LABEL[sym] ?? '?'} ×${n}`)
    .join(', ')
  const out = [`Маршрутов по значкам: ${counts || 'не распознано'}`]
  for (const e of summary.entries) {
    const empty = e.listed === 0 && e.more === 0
    out.push(
      `${e.symbol} ${e.route} — путей перечислено: ${e.listed}`
        + (e.more > 0 ? `, «ещё»: ${e.more} (всего ${e.listed + e.more})` : '')
        + (empty ? ' (список путей пуст)' : ''),
    )
  }
  return out
}

// ─── сборка ответа deploy_status ─────────────────────────────────────────────

export interface StatusLogOptions {
  grep?: string
  regex?: boolean
  context?: number
  routeTable?: boolean
  /** Курсор, как в запросе: от него зависит, какую сторону обрезать при переполнении. */
  sinceLine?: number
}

/** Размер элемента `output` в pretty-JSON: отступ + строка + запятая + перевод строки. */
const jsonLineCost = (s: string): number => JSON.stringify(s).length + 7

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === 'string')
}

const fence = (lines: readonly string[]): string[] => ['```text', ...lines, '```']

/**
 * Тело ответа `deploy_status` (без заголовка «## Деплой на …»).
 *
 * - Без `grep`/`routeTable` и пока лог влезает в бюджет — прежний формат, JSON снапшота как есть.
 * - Без фильтров, но лог не влезает — `output` урезается по бюджету, сверху предупреждение и
 *   `nextSinceLine`. С курсором отдаём начало (листать вперёд), без курсора — хвост (свежее).
 * - С `grep`/`routeTable` — `output` из JSON убирается, вместо него разделы с результатом.
 *
 * `data` — `data` из ответа dashboard-agent; если `output` в нём не массив строк (дрейф версий
 * агента), отдаём прежним форматом, ничего не фильтруя.
 */
export function renderDeployStatusBody(data: unknown, opts: StatusLogOptions): string {
  const snapshot = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
  if (!isStringArray(snapshot.output)) {
    return pretty(data)
  }
  const { output, ...rest } = snapshot as { output: string[] } & Record<string, unknown>
  const truncatedByAgent = typeof rest.truncatedLines === 'number' ? rest.truncatedLines : 0
  const fromLine = typeof rest.fromLine === 'number' ? rest.fromLine : truncatedByAgent
  const totalLines = typeof rest.totalLines === 'number' ? rest.totalLines : fromLine + output.length
  const lines = numberLines(output, fromLine)
  const firstN = lines[0]?.n ?? fromLine
  const lastN = lines.at(-1)?.n ?? fromLine

  const wantGrep = opts.grep !== undefined
  const wantRoutes = opts.routeTable === true

  // ── фильтры ──
  if (wantGrep || wantRoutes) {
    const budget = wantGrep && wantRoutes ? LOG_BUDGET_CHARS / 2 : LOG_BUDGET_CHARS
    const evicted = truncatedByAgent > 0
      ? `Первые ${truncatedByAgent} строк лога вытеснены на агенте (лимит 2000) и недоступны.`
      : null
    const sections = [
      ...(wantRoutes ? renderRouteSection(lines, budget, evicted) : []),
      ...(wantGrep ? renderGrepSection(lines, opts, budget, evicted) : []),
    ]
    const view = {
      ...rest,
      logView: { scannedFromLine: firstN, scannedToLine: lastN, scannedLines: lines.length, totalLines },
    }
    return [pretty(view), '', ...sections].join('\n')
  }

  // ── без фильтров ──
  const size = output.reduce((sum, s) => sum + jsonLineCost(s), 0)
  if (size <= LOG_BUDGET_CHARS) {
    return pretty(data)
  }
  const keep = opts.sinceLine !== undefined ? 'head' : 'tail'
  const { kept, omitted } = fitToBudget(lines, (l) => jsonLineCost(clipLine(l.text)), LOG_BUDGET_CHARS, keep)
  const shownFrom = kept[0]?.n ?? fromLine
  const shownTo = kept.at(-1)?.n ?? fromLine
  const notice = [
    `⚠️ Лог обрезан до лимита ответа (~${LOG_BUDGET_CHARS / 1000} тыс. символов): показано ${kept.length} из `
    + `${lines.length} строк (${shownFrom}…${shownTo} из ${totalLines}), не показано ${omitted}.`,
    keep === 'head'
      ? `Продолжить чтение: sinceLine: ${shownTo + 1}.`
      : `Показан хвост (свежее). Читать с начала: sinceLine: ${firstN}.`,
    'Нужны конкретные места — задай grep (подстрока/regex) или routeTable: true вместо чтения всего лога.',
  ]
  const view = {
    ...rest,
    fromLine: shownFrom,
    output: kept.map((l) => clipLine(l.text)),
    outputTruncated: { keep, omittedLines: omitted, nextSinceLine: shownTo + 1 },
  }
  return [...notice, '', pretty(view)].join('\n')
}

function renderRouteSection(lines: readonly LogLine[], budget: number, evicted: string | null): string[] {
  const blocks = findRouteTables(lines)
  if (blocks.length === 0) {
    return [
      '### Таблица маршрутов Next.js',
      `Не найдена среди ${lines.length} просмотренных строк (ищу «Route (app)» … легенду «(Static)/(SSG)/(Dynamic)»).`,
      ...(evicted ? [evicted] : []),
      '',
    ]
  }
  const out: string[] = []
  for (const [idx, block] of blocks.entries()) {
    const title = blocks.length > 1
      ? `Таблица маршрутов Next.js (${idx + 1} из ${blocks.length})`
      : 'Таблица маршрутов Next.js'
    out.push(`### ${title} — строки ${block.fromLine}–${block.toLine}`)
    if (!block.complete) {
      out.push(
        '⚠️ Легенда «(Static)/(SSG)/(Dynamic)» не найдена — блок может быть неполным (лог оборван или вытеснен).',
      )
    }
    out.push(...renderRouteSummary(summarizeRouteTable(block.lines)), '')
    const { kept, omitted } = fitToBudget(block.lines, (l) => clipLine(l).length + 1, budget, 'head')
    out.push(...fence(kept.map((l) => clipLine(l))))
    if (omitted > 0) {
      out.push(
        `⚠️ Обрезано по лимиту ответа: показано ${kept.length} из ${block.lines.length} строк таблицы `
          + '(сводка выше — по всей таблице).',
      )
    }
    out.push('')
  }
  return out
}

function renderGrepSection(
  lines: readonly LogLine[],
  opts: StatusLogOptions,
  budget: number,
  evicted: string | null,
): string[] {
  const pattern = opts.grep as string
  const context = opts.context ?? 0
  const mode = opts.regex ? 'regex' : 'подстрока'
  const { rows, matchCount } = grepLines(lines, buildMatcher(pattern, opts.regex === true), context)
  const head = `### grep «${pattern}» (${mode}, без учёта регистра${context > 0 ? `, контекст ±${context}` : ''})`
  if (matchCount === 0) {
    return [head, `Совпадений нет среди ${lines.length} просмотренных строк.`, ...(evicted ? [evicted] : []), '']
  }
  const width = String(lines.at(-1)?.n ?? 0).length
  const rendered = rows.map((row) => ({ row, text: renderGrepRow(row, width) }))
  const { kept, omitted } = fitToBudget(rendered, (r) => r.text.length + 1, budget, 'head')
  const out = [`${head} — совпадений: ${matchCount}`, ...fence(kept.map((r) => r.text))]
  if (omitted > 0) {
    const shownMatches = kept.filter((r) => r.row.kind === 'match').length
    const lastShown = [...kept].reverse().find((r) => r.row.n !== undefined)?.row.n
    out.push(
      `⚠️ Обрезано по лимиту ответа: показано ${shownMatches} из ${matchCount} совпадений (первые). `
        + `Сузь grep${lastShown !== undefined ? ` или продолжи с sinceLine: ${lastShown + 1}` : ''}.`,
    )
  }
  out.push('')
  return out
}

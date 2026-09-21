/**
 * Захват таблицы маршрутов Next.js из потока лога деплоя (PLAN-INFRA-6.md §157).
 *
 * Зачем: лог деплоя капится MAX_OUTPUT_LINES, старые строки вытесняются (lib/deploy-history.ts).
 * Таблица «Route (app)» печатается шагом `nx build` в фазе `build` — раньше docker build/push,
 * sourcemaps и release на s2, то есть в начале лога, и вытесняется первой. Проверки пилотов
 * (`deploy_status({ routeTable: true })`) без неё слепнут. Держать блок отдельно дешевле, чем
 * поднимать общий лимит: он занимает килобайты, а не сотни килобайт на каждую персистацию в Redis.
 *
 * Чистые функции без побочных эффектов кроме мутации переданного массива — как applyPhaseLine.
 * Формат заголовка и легенды совпадает с libs/deploy-mcp/src/log-tools.ts (агент собран изолированно
 * от монорепо и не может импортировать оттуда — регулярки продублированы намеренно).
 */

/** Один захваченный блок таблицы маршрутов. */
export interface RouteTableCapture {
  /** Сквозной номер строки «Route (app)» в логе (с учётом вытесненных). */
  fromLine: number
  /** Сквозной номер последней строки, вошедшей в блок. */
  toLine: number
  /** Строки блока без пустых — от «Route (app)» до легенды включительно (как есть, с ANSI). */
  lines: string[]
  /** true — легенда `(Static)/(SSG)/(Dynamic)` найдена; false — блок оборван или упёрся в лимит. */
  complete: boolean
}

/** Сколько блоков держим на деплой: обычно один (`--app`), несколько — при деплое нескольких приложений. */
export const MAX_ROUTE_TABLES = 4
/** Потолок строк одного блока: у приложений с большим `generateStaticParams` таблица длинная. */
export const MAX_ROUTE_TABLE_LINES = 600

const ROUTE_HEADER_RE = /Route \((?:app|pages)\)/
const LEGEND_RE = /\((?:Static|SSG|ISR|Dynamic|Partial Prerender)\)/
// `#14 45.123 ` — префикс `docker build --progress=plain`; пустая строка бывает и с ним.
const BLANK_RE = /^(?:#\d+\s+[\d.]+)?\s*$/

/**
 * Скармливает блок-состоянию одну строку лога. `lineNo` — сквозной номер этой строки
 * (`truncatedLines + индекс в output`). Мутирует `tables`.
 *
 * Блок закрывается на первой строке после легенды, не являющейся легендой: легенда Next.js — это
 * несколько подряд идущих строк (`○ (Static)`, `● (SSG)`, `ƒ (Dynamic)`), по ним читаются значки.
 */
export function captureRouteTableLine(tables: RouteTableCapture[], line: string, lineNo: number): void {
  const last = tables.at(-1)
  const legend = LEGEND_RE.test(line)

  // Блок открыт, пока не найдена легенда и не упёрлись в лимит строк
  if (last && !last.complete && last.lines.length < MAX_ROUTE_TABLE_LINES) {
    last.toLine = lineNo
    if (!BLANK_RE.test(line)) {
      last.lines.push(line)
    }
    if (legend) {
      last.complete = true
    }
    return
  }
  // После легенды подряд идущие строки легенды всё ещё принадлежат блоку
  if (last?.complete && legend && last.toLine === lineNo - 1) {
    last.toLine = lineNo
    last.lines.push(line)
    return
  }
  if (ROUTE_HEADER_RE.test(line)) {
    tables.push({ fromLine: lineNo, toLine: lineNo, lines: [line], complete: false })
    if (tables.length > MAX_ROUTE_TABLES) {
      // Сбор нового блока важнее старого: вытесняем самый ранний, как и лог
      tables.shift()
    }
  }
}

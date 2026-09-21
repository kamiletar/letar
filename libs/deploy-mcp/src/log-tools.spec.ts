import { describe, expect, it } from 'vitest'
import {
  buildMatcher,
  cleanLine,
  clipLine,
  findRouteTables,
  fitToBudget,
  grepLines,
  LINE_MAX_CHARS,
  type LogLine,
  numberLines,
  summarizeRouteTable,
} from './log-tools'

const lines = (texts: string[], from = 0): LogLine[] => numberLines(texts, from)

describe('cleanLine / clipLine', () => {
  it('снимает ANSI и хвостовой \\r', () => {
    expect(cleanLine('[31mred[0m text\r')).toBe('red text')
  })

  it('короткая строка не меняется, длинная получает счётчик отброшенного', () => {
    expect(clipLine('abc')).toBe('abc')
    const long = 'x'.repeat(LINE_MAX_CHARS + 25)
    expect(clipLine(long)).toBe(`${'x'.repeat(LINE_MAX_CHARS)}… [+25 симв.]`)
  })
})

describe('buildMatcher', () => {
  it('подстрока: регистр не важен, спецсимволы буквальны', () => {
    const m = buildMatcher('[slug]', false)
    expect(m('route /[SLUG]')).toBe(true)
    expect(m('route s')).toBe(false)
  })

  it('regex: альтернативы работают, регистр не важен', () => {
    const m = buildMatcher('econnrefused|p1001', true)
    expect(m('code P1001')).toBe(true)
    expect(m('ok')).toBe(false)
  })

  it('некорректный regex бросает SyntaxError', () => {
    expect(() => buildMatcher('(', true)).toThrow(SyntaxError)
  })
})

describe('grepLines', () => {
  const log = lines(['a', 'HIT 1', 'b', 'c', 'd', 'e', 'HIT 2', 'f', 'HIT 3', 'g'], 100)
  const hit = buildMatcher('hit', false)

  it('без контекста — только совпадения со сквозными номерами', () => {
    const { rows, matchCount } = grepLines(log, hit, 0)
    expect(matchCount).toBe(3)
    expect(rows.filter((r) => r.kind === 'match').map((r) => r.n)).toEqual([101, 106, 108])
    expect(rows.some((r) => r.kind === 'gap')).toBe(true)
  })

  it('пересекающиеся контексты сливаются, совпадение внутри чужого контекста остаётся совпадением', () => {
    const { rows } = grepLines(log, hit, 1)
    // HIT 2 (106) и HIT 3 (108) разделены одной строкой (107) — одна группа, без gap между ними.
    const kinds = rows.map((r) => `${r.n ?? '--'}:${r.kind}`)
    expect(kinds).toEqual([
      '100:context',
      '101:match',
      '102:context',
      '--:gap',
      '105:context',
      '106:match',
      '107:context',
      '108:match',
      '109:context',
    ])
  })

  it('контекст не выходит за границы лога', () => {
    const { rows } = grepLines(lines(['HIT', 'x']), hit, 5)
    expect(rows.map((r) => r.n)).toEqual([0, 1])
  })

  it('нет совпадений — пусто', () => {
    expect(grepLines(log, buildMatcher('zzz', false), 2)).toEqual({ rows: [], matchCount: 0 })
  })
})

describe('fitToBudget', () => {
  const cost = (s: string) => s.length
  it('head оставляет начало, tail — конец', () => {
    const items = ['aaa', 'bbb', 'ccc', 'ddd']
    expect(fitToBudget(items, cost, 6, 'head')).toEqual({ kept: ['aaa', 'bbb'], omitted: 2 })
    expect(fitToBudget(items, cost, 6, 'tail')).toEqual({ kept: ['ccc', 'ddd'], omitted: 2 })
  })

  it('один элемент остаётся всегда, даже если он один больше бюджета', () => {
    expect(fitToBudget(['x'.repeat(100)], cost, 10, 'head')).toEqual({ kept: ['x'.repeat(100)], omitted: 0 })
    expect(fitToBudget(['x'.repeat(100), 'y'], cost, 10, 'tail').kept).toEqual(['y'])
  })

  it('всё влезает — ничего не отброшено', () => {
    expect(fitToBudget(['a', 'b'], cost, 100, 'head').omitted).toBe(0)
  })
})

describe('findRouteTables / summarizeRouteTable', () => {
  const table = [
    'Route (app)',
    '┌ ○ /',
    '├ ◐ /[locale]/news/[id]',
    '│ ├ /ru/news/1',
    '│ └ [+1 more path]',
    '└ ƒ /admin',
    '',
    '○  (Static)   prerendered as static content',
    '◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content',
    'ƒ  (Dynamic)  server-rendered on demand',
    'после таблицы',
  ]

  it('легенда включается целиком, строки после неё — нет; пустые строки отброшены', () => {
    const [block] = findRouteTables(lines(table, 40))
    expect(block?.complete).toBe(true)
    expect(block?.fromLine).toBe(40)
    expect(block?.toLine).toBe(49)
    expect(block?.lines).not.toContain('')
    expect(block?.lines.at(-1)).toContain('(Dynamic)')
    expect(block?.lines).not.toContain('после таблицы')
  })

  it('«Route (pages)» тоже находится', () => {
    expect(findRouteTables(lines(['Route (pages)', '┌ ○ /', '○ (Static) x']))).toHaveLength(1)
  })

  it('нет заголовка — нет блоков', () => {
    expect(findRouteTables(lines(['ничего', 'нет']))).toEqual([])
  })

  it('сводка понимает ◐ и единственное число «[+1 more path]»', () => {
    const [block] = findRouteTables(lines(table))
    const summary = summarizeRouteTable(block?.lines ?? [])
    expect(summary.bySymbol).toEqual({ '○': 1, '◐': 1, ƒ: 1 })
    expect(summary.entries).toEqual([{ route: '/[locale]/news/[id]', symbol: '◐', listed: 1, more: 1 }])
  })

  it('последний маршрут с потомками без «│» (пробелы вместо вертикали) не теряет пути', () => {
    const summary = summarizeRouteTable([
      'Route (app)',
      '└ ● /[slug]',
      '  ├ /a',
      '  └ /b',
    ])
    expect(summary.entries).toEqual([{ route: '/[slug]', symbol: '●', listed: 2, more: 0 }])
  })
})

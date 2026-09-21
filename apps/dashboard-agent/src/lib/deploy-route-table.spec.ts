/**
 * Тесты захвата таблицы маршрутов Next.js из потока лога деплоя (PLAN-INFRA-6.md §157):
 * блок переживает вытеснение старых строк лога, а сам захват не растёт без границ.
 */

import { describe, expect, it } from 'vitest'
import {
  captureRouteTableLine,
  MAX_ROUTE_TABLE_LINES,
  MAX_ROUTE_TABLES,
  type RouteTableCapture,
} from './deploy-route-table'

/** Прогоняет строки через захват, нумеруя их с `start` — как appendOutput нумерует лог. */
function feed(tables: RouteTableCapture[], lines: string[], start = 0): number {
  lines.forEach((line, i) => captureRouteTableLine(tables, line, start + i))
  return start + lines.length
}

const TABLE = [
  'Route (app)',
  '┌ ○ /',
  '├ ● /blog/[slug]',
  '├   ├ /blog/first',
  '├   └ [+3 more paths]',
  '└ ƒ /api/health',
  '',
  '○  (Static)   prerendered as static content',
  '●  (SSG)      prerendered as static HTML (uses generateStaticParams)',
  'ƒ  (Dynamic)  server-rendered on demand',
]

describe('captureRouteTableLine', () => {
  it('захватывает блок от «Route (app)» до конца легенды, без пустых строк', () => {
    const tables: RouteTableCapture[] = []
    const end = feed(tables, ['компиляция', 'Generating static pages (12/12)', ...TABLE, '🐳 Building Docker image'])

    expect(tables).toHaveLength(1)
    const [block] = tables
    expect(block?.complete).toBe(true)
    expect(block?.fromLine).toBe(2)
    expect(block?.toLine).toBe(2 + TABLE.length - 1)
    expect(block?.lines).toEqual(TABLE.filter((l) => l !== ''))
    expect(end).toBe(2 + TABLE.length + 1)
  })

  it('строки после легенды в блок не попадают', () => {
    const tables: RouteTableCapture[] = []
    feed(tables, [...TABLE, '✅ Build completed for kami', 'ƒ строка, но не легенда'])
    expect(tables[0]?.lines.at(-1)).toContain('(Dynamic)')
    expect(tables[0]?.lines.join('\n')).not.toContain('Build completed')
  })

  it('терпит префикс docker build --progress=plain и пустые строки с ним', () => {
    const tables: RouteTableCapture[] = []
    feed(tables, [
      '#14 45.123 Route (app)',
      '#14 45.123 ┌ ○ /',
      '#14 45.123 ',
      '#14 45.123 ○  (Static)  prerendered as static content',
    ])
    expect(tables[0]?.complete).toBe(true)
    expect(tables[0]?.lines).toHaveLength(3)
  })

  it('оборванный блок (лога дальше нет) остаётся с complete: false', () => {
    const tables: RouteTableCapture[] = []
    feed(tables, ['Route (app)', '┌ ○ /'])
    expect(tables).toHaveLength(1)
    expect(tables[0]?.complete).toBe(false)
  })

  it('блок без легенды упирается в MAX_ROUTE_TABLE_LINES и перестаёт расти', () => {
    const tables: RouteTableCapture[] = []
    const body = Array.from({ length: MAX_ROUTE_TABLE_LINES + 50 }, (_, i) => `├ ○ /page-${i}`)
    feed(tables, ['Route (app)', ...body])
    expect(tables[0]?.lines).toHaveLength(MAX_ROUTE_TABLE_LINES)
    expect(tables[0]?.complete).toBe(false)
  })

  it('обычные строки лога до заголовка ничего не создают', () => {
    const tables: RouteTableCapture[] = []
    feed(tables, ['🔨 Building kami', '::phase:build:start', 'Static asset (Static) в тексте, но без заголовка'])
    expect(tables).toEqual([])
  })

  it('несколько сборок в одном деплое — отдельные блоки, старейшие вытесняются сверх MAX_ROUTE_TABLES', () => {
    const tables: RouteTableCapture[] = []
    const total = MAX_ROUTE_TABLES + 2
    let n = 0
    for (let i = 0; i < total; i++) {
      n = feed(tables, ['сборка', ...TABLE], n)
    }
    expect(tables).toHaveLength(MAX_ROUTE_TABLES)
    expect(tables.every((t) => t.complete)).toBe(true)
    // Остались самые поздние блоки
    expect(tables[0]?.fromLine).toBe((total - MAX_ROUTE_TABLES) * (TABLE.length + 1) + 1)
  })

  it('номера строк сквозные: работает с начальным смещением (после вытеснения)', () => {
    const tables: RouteTableCapture[] = []
    feed(tables, TABLE, 170)
    expect(tables[0]?.fromLine).toBe(170)
    expect(tables[0]?.toLine).toBe(170 + TABLE.length - 1)
  })
})

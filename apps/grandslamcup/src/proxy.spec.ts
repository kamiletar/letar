import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Собирает множество первых URL-сегментов, которые реально существуют в `src/app/**`
 * (route groups `(x)` прозрачны для URL — их содержимое разворачивается на этом же уровне,
 * приватные папки `_x` и динамический `[citySlug]` в сегменты не попадают).
 */
function collectTopLevelSegments(dir: string): Set<string> {
  const segments = new Set<string>()

  for (const entry of readdirSync(dir)) {
    const entryPath = join(dir, entry)
    if (!statSync(entryPath).isDirectory()) { continue }

    if (entry.startsWith('_')) { continue }

    if (entry.startsWith('(') && entry.endsWith(')')) {
      for (const nested of collectTopLevelSegments(entryPath)) {
        segments.add(nested)
      }
      continue
    }

    if (entry.startsWith('[') && entry.endsWith(']')) { continue }

    segments.add(entry)
  }

  return segments
}

describe('proxy RESERVED_SEGMENTS', () => {
  it('совпадает со списком реальных top-level роутов в src/app', () => {
    const appDir = join(__dirname, 'app')
    const actualSegments = collectTopLevelSegments(appDir)

    // Импорт proxy.ts напрямую тянет @/lib/db (инициализация Prisma) — сверяем литерал текстом,
    // тот же паттерн, что и apps/aboi/src/proxy.spec.ts.
    const source = readFileSync(join(__dirname, 'proxy.ts'), 'utf-8')
    const match = source.match(/RESERVED_SEGMENTS = new Set\(\[([\s\S]*?)\]\)/)
    if (!match) { throw new Error('Не удалось найти литерал RESERVED_SEGMENTS в proxy.ts') }
    const declaredSegments = new Set(
      [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]),
    )

    expect(declaredSegments).toEqual(actualSegments)
  })
})

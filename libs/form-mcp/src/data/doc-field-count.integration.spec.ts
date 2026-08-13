import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { buildFieldRegistry } from './field-registry.js'
import { loadDocs } from './loader.js'

/**
 * Инцидент №2 (2026-08-13): README писал «56»/«57 полей», а `list_fields` уже
 * отдавал 61 (document-поля добавились после Фазы 8). `field-registry.integration.spec.ts`
 * защищает КОД (сам реестр и `fields.md`), но не прозу — руками написанные числа в README
 * не пересчитываются сами и расходятся при каждом добавлении поля.
 *
 * Этот тест — страж прозы: каждая запись в LIVE_MENTIONS указывает файл и regex с одной
 * capture-группой (число), claiming ТЕКУЩЕЕ состояние `@letar/forms`. Если число полей
 * меняется, а прозу не обновили — тест краснеет.
 *
 * НЕ добавляй сюда исторические записи (CHANGELOG.md/PLAN.md с датой) — это факт на момент
 * записи, не текущее состояние; и НЕ добавляй сюда сравнительные числа Vue-скинов
 * (forms-vue/forms-vue-shadcn README) — они описывают долю портированных полей, это
 * отдельная задача (см. `libs/forms/PLAN.md` → Фаза 9).
 */
const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', '..')
const docsPath = join(repoRoot, 'libs', 'forms', 'docs')
const registry = buildFieldRegistry(loadDocs(docsPath).sections.fields)
const actualFieldCount = registry.size

const LIVE_MENTIONS: Array<{ file: string; pattern: RegExp }> = [
  { file: 'libs/forms/README.md', pattern: /chakraUIKit\s*\+\s*(\d+)\s*поле/ },
]

describe('README не расходится с реальным числом полей @letar/forms', () => {
  it('actualFieldCount > 0 (registry загрузился)', () => {
    expect(actualFieldCount).toBeGreaterThan(0)
  })

  it.each(LIVE_MENTIONS)('$file заявляет актуальное число полей', ({ file, pattern }) => {
    const content = readFileSync(join(repoRoot, file), 'utf-8')
    const match = content.match(pattern)
    expect(match, `паттерн не найден в ${file} — обнови regex в LIVE_MENTIONS`).toBeTruthy()
    expect(
      Number(match![1]),
      `${file}: заявлено ${match![1]} полей, реально ${actualFieldCount} (см. list_fields)`,
    ).toBe(actualFieldCount)
  })
})

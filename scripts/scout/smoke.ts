#!/usr/bin/env bun
/**
 * Дымовая проверка скаута: индекс собирается из текущего репо, разбор INDEX.md не сломан
 * сменой формата записей, три известных запроса находят свои доки. Справка по формам: каталог
 * полей `libs/forms/docs/fields.md` и реестр паттернов form-mcp разбираются, у каждого паттерна
 * есть русская подсказка, BM25 находит поле по его русскому описанию.
 *
 * Не заменяет eval.ts (тот меряет качество на транскриптах и работает только на машине владельца):
 * ловит поломку разбора, после которой хук молча отдаёт пустые или мусорные справки.
 *
 * Запуск: bun scripts/scout/smoke.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Bm25, buildIndex, collectCards, PATTERN_HINTS, scout } from '../../libs/scout/src/index'
import { findRepoRoot } from './index-store'

/** Запрос → док, который обязан попасть в справку. Доки публичные, запросы — реальные формулировки */
const PROBES: Array<[string, string]> = [
  ['деплой упал на frozen-lockfile', '.claude/docs/bun-lock-drift-unpushed-commits-blocks-all-deploys.md'],
  ['плавающая ошибка гидратации 418 на прод-сборке', '.claude/docs/emotion-streaming-inline-style-hydration-418.md'],
  ['next build падает OOM на Collecting page data', '.claude/docs/nextjs-build-worker-count-oom-shared-host.md'],
]

const root = findRepoRoot()
if (!root) {
  console.error('Не найден корень репозитория')
  process.exit(1)
}
const cards = collectCards(root)
const docs = cards.filter((c) => c.kind === 'doc')
const annotated = docs.filter((c) => c.topic).length
const problems: string[] = []
if (docs.length < 100) {
  problems.push(`доков в индексе ${docs.length} — ждали сотни, сломан обход .claude/docs`)
}
if (annotated / Math.max(docs.length, 1) < 0.8) {
  problems.push(
    `аннотацию из INDEX.md получили ${annotated} из ${docs.length} доков — формат записей INDEX.md разошёлся с парсером`,
  )
}
if (!cards.some((c) => c.kind === 'skill') || !cards.some((c) => c.kind === 'agent')) {
  problems.push('нет карточек скилов или субагентов — сломан разбор frontmatter')
}
const fields = cards.filter((c) => c.kind === 'field')
const patterns = cards.filter((c) => c.kind === 'pattern')
if (fields.length < 40) {
  problems.push(`карточек полей форм ${fields.length} — ждали ~60, разошёлся формат таблиц libs/forms/docs/fields.md`)
}
// Число паттернов сверяем точно: сколько ключей в реестре form-mcp, столько карточек
const registryPath = join(root, 'libs/form-mcp/src/data/pattern-registry.ts')
const registryCount = existsSync(registryPath)
  ? (readFileSync(registryPath, 'utf8').match(/^ {4}name: /gm) ?? []).length
  : 0
if (patterns.length < 10 || patterns.length !== registryCount) {
  problems.push(
    `паттернов форм ${patterns.length}, в реестре form-mcp ${registryCount} — разошёлся формат реестра form-mcp`,
  )
}
const unhinted = patterns.filter((c) => !PATTERN_HINTS[c.title]).map((c) => c.title)
if (unhinted.length) {
  problems.push(
    `у паттернов нет русской подсказки в PATTERN_HINTS (libs/scout/src/lib/collect.ts): ${unhinted.join(', ')}`,
  )
}
const engine = new Bm25(buildIndex(cards))
const FIELD_PROBES: Array<[string, string]> = [
  ['форма заявки с телефоном клиента', 'Form.Field.Phone'],
  ['поле ИНН организации в форме', 'Form.Document.INN'],
]
for (const [query, expected] of FIELD_PROBES) {
  const got = scout(engine, query).fields.map((f) => f.name)
  if (!got.includes(expected)) {
    problems.push(`«${query}» не дал поле ${expected}; полка: ${got.join(', ') || 'пусто'}`)
  }
}
for (const [query, expected] of PROBES) {
  const result = scout(engine, query)
  const got = [...result.docs, ...result.traps].map((d) => d.path)
  if (!got.includes(expected)) {
    problems.push(`«${query}» не нашёл ${expected}; справка: ${got.join(', ') || 'пусто'}`)
  }
}
if (problems.length) {
  console.error(`✗ скаут: ${problems.length} проблем(ы)\n${problems.map((p) => `  - ${p}`).join('\n')}`)
  process.exit(1)
}
console.log(
  `✓ скаут: ${cards.length} карточек, ${annotated}/${docs.length} доков с аннотацией, ${fields.length} полей и ${patterns.length} паттернов форм, ${
    PROBES.length + FIELD_PROBES.length
  } проб прошли`,
)

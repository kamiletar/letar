#!/usr/bin/env bun
/**
 * Дымовая проверка скаута: индекс собирается из текущего репо, разбор INDEX.md не сломан
 * сменой формата записей, три известных запроса находят свои доки.
 *
 * Не заменяет eval.ts (тот меряет качество на транскриптах и работает только на машине владельца):
 * ловит поломку разбора, после которой хук молча отдаёт пустые или мусорные справки.
 *
 * Запуск: bun scripts/scout/smoke.ts
 */
import { Bm25, buildIndex, collectCards, scout } from '../../libs/scout/src/index'
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
const engine = new Bm25(buildIndex(cards))
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
  `✓ скаут: ${cards.length} карточек, ${annotated}/${docs.length} доков с аннотацией, ${PROBES.length} проб прошли`,
)

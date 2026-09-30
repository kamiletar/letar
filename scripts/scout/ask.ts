#!/usr/bin/env bun
/**
 * Спросить скаута вручную: тот же поиск, что у хука (`scoutQuery`), но по запросу из командной строки.
 * Печатает справку — доки и ловушки с `файл:строка`, инструмент, полку полей формы — и время ответа.
 * Каждый вопрос пишется в `SCOUT_HOME/logs/asks.jsonl` (формат строки — как у лога хука).
 *
 * Запуск: bun scripts/scout/ask.ts "<запрос>" [--json]
 */
import { Bm25, formatBrief } from '../../libs/scout/src/index'
import { appendLog, freshIndex, scoutQuery } from './hook-core'
import { findRepoRoot } from './index-store'
import { scoutHome } from './paths'

async function main() {
  const query = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(' ').trim()
  if (!query) {
    console.error('Запуск: bun scripts/scout/ask.ts "<запрос>" [--json]')
    process.exit(1)
  }
  const root = findRepoRoot()
  if (!root) {
    console.error('Не найден корень репозитория')
    process.exit(1)
  }
  const home = scoutHome()
  const engine = new Bm25(freshIndex(root, home))
  const { result, forms, ms } = await scoutQuery(engine, home, query)
  const brief = formatBrief(result)
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ result, forms, ms }))
  } else {
    console.log(brief || 'скаут: по запросу ничего не нашёл')
    console.log(`(${Math.round(ms)} мс, полка форм: ${forms})`)
  }
  try {
    appendLog(home, {
      ts: new Date().toISOString(),
      query: query.slice(0, 600),
      cwd: process.cwd(),
      docs: result.docs.map((d) => `${d.path}:${d.line}`),
      traps: result.traps.map((d) => `${d.path}:${d.line}`),
      tool: result.tool ? `${result.tool.kind}:${result.tool.name}` : undefined,
      fields: result.fields.map((f) => f.name),
      pattern: result.pattern?.name,
      forms,
      chars: brief.length,
      ms: Math.round(ms),
    }, 'asks.jsonl')
  } catch {
    // лог — удобство, не повод ронять CLI
  }
}

if (import.meta.main) {
  await main()
}

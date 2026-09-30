// UserPromptSubmit: справка локального скаута на первое содержательное сообщение сессии.
// Fail-open: любая ошибка или превышение бюджета — пустой вывод и код 0, агент работает как раньше.
// По умолчанию теневой режим (только лог в SCOUT_HOME/logs/briefs.jsonl); режим — SCOUT_HOME/config.json
// `{"mode": "on" | "ab" | "shadow"}` или env SCOUT_MODE. Разбор — .claude/docs/local-scout.md
import { appendLog, type HookPayload, runScoutHook } from '../../scripts/scout/hook-core'
import { findRepoRoot } from '../../scripts/scout/index-store'
import { scoutHome } from '../../scripts/scout/paths'

/** Внутренний бюджет; у харнесса `timeout: 5` — запас на старт bun */
const BUDGET_MS = 2500

const guard = setTimeout(() => process.exit(0), BUDGET_MS)

try {
  const payload = JSON.parse(await Bun.stdin.text()) as HookPayload
  const root = findRepoRoot(payload.cwd ?? process.cwd())
  if (root) {
    const home = scoutHome()
    const { output, log } = await runScoutHook(payload, root, home)
    if (log) {
      appendLog(home, log)
    }
    if (output) {
      process.stdout.write(JSON.stringify(output))
    }
  }
} catch {
  // fail-open: скаут никогда не мешает сессии
}
clearTimeout(guard)
process.exit(0)

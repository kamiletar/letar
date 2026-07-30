#!/usr/bin/env node
/**
 * Stop хук — напоминание про тайм-трекер studio (Фаза 11 §11.5/§11.11 PLAN.md).
 * Первый Stop-хук в репозитории.
 *
 * ⚠️ Stop ≠ конец сессии. Событие Stop срабатывает в конце КАЖДОГО ответа агента, а не при
 * завершении работы. Первая версия хука блокировала Stop при живом таймере с формулировкой
 * «останови перед завершением сессии» — в результате агент послушно останавливал таймер после
 * каждой реплики, дробя одну работу на десяток огрызков (найдено 2026-07-30).
 *
 * Поэтому живой таймер здесь больше НЕ повод блокировать:
 * - `time-heartbeat.js` (PostToolUse) обновляет lastSeenAt на каждый вызов инструмента;
 * - сервер сам закрывает запись по простою (`autoClosedIdle`).
 *   Забытый таймер ловится этим, а не приставанием на каждой реплике.
 *
 * Остаётся одна проверка — эвристика смен контекста: сравнивает число задетых за сессию
 * apps/<x>/ с числом вызовов time_switch/time_start (best-effort по транскрипту, возможны
 * ложные срабатывания — например при чтении чужого приложения для справки).
 *
 * Когда таймер положено останавливать — `.claude/rules/time-tracking.md`.
 *
 * Fail-open во всём: нет TIME_MCP_SECRET, studio недоступен, транскрипт не читается —
 * всегда approve, не блокируем сессию по техническим причинам.
 */

const fs = require('fs')
const readline = require('readline')
const { getStudioTimeConfig } = require('./lib/studio-time-env')

// STUDIO_URL здесь не нужен: хук больше не ходит в API, а секрет читается только как признак
// «тайм-трекинг в этой среде настроен».
const { secret: SECRET } = getStudioTimeConfig()

function approve() {
  console.log(JSON.stringify({ decision: 'approve' }))
  process.exit(0)
}

function block(reason) {
  console.log(JSON.stringify({ decision: 'block', reason }))
  process.exit(0)
}

/**
 * Best-effort разбор транскрипта: какие apps/<x>/ задеты инструментами и сколько раз звался
 * time_switch/time_start. Формат транскрипта не документирован жёстко, поэтому парсинг
 * максимально терпимый — любая нераспознанная строка/поле просто пропускается.
 */
async function analyzeTranscript(transcriptPath) {
  const workspaces = new Set()
  let switches = 0

  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return { workspaces, switches }
  }

  try {
    const rl = readline.createInterface({ input: fs.createReadStream(transcriptPath), crlfDelay: Infinity })
    for await (const line of rl) {
      const trimmed = line.trim()
      if (!trimmed) {
        continue
      }
      let entry
      try {
        entry = JSON.parse(trimmed)
      } catch {
        continue
      }

      const toolName = entry?.tool_name ?? entry?.message?.tool_name ?? ''
      if (typeof toolName === 'string' && /time_switch|time_start/.test(toolName)) {
        switches++
      }

      const toolInput = entry?.tool_input ?? entry?.message?.tool_input ?? {}
      const filePath = toolInput?.file_path ?? toolInput?.path ?? ''
      if (typeof filePath === 'string') {
        const m = filePath.replace(/\\/g, '/').match(/apps\/([a-z0-9-]+)\//)
        if (m) {
          workspaces.add(m[1])
        }
      }
    }
  } catch {
    // Транскрипт нечитаем/повреждён — эвристику пропускаем, не блокируем из-за этого
  }

  return { workspaces, switches }
}

async function main() {
  let input = ''
  process.stdin.setEncoding('utf8')
  for await (const chunk of process.stdin) {
    input += chunk
  }

  let data
  try {
    data = JSON.parse(input)
  } catch {
    approve()
    return
  }

  if (!SECRET) {
    // Тайм-трекинг не настроен в этой среде — не мешаем
    approve()
    return
  }

  // Живой таймер намеренно НЕ блокирует Stop — см. шапку файла. Останов таймера привязан к
  // смыслу работы (новая задача, /end-session, прямая просьба), а не к концу реплики.

  const { workspaces, switches } = await analyzeTranscript(data.transcript_path)
  // -1: первая рабочая область — стартовый контекст сессии, переключение на неё не требуется
  if (workspaces.size > 1 && switches < workspaces.size - 1) {
    block(
      `🔀 За сессию затронуты приложения: ${[...workspaces].join(', ')} (${workspaces.size}), а `
        + `time_switch/time_start вызван ${switches} раз(а). Похоже, при смене проекта забыт time_switch — `
        + 'время могло записаться не туда (или не записаться вовсе). Если это ложное срабатывание '
        + '(например, читал чужой код для справки без реальной работы над ним) — можно продолжить как есть.',
    )
    return
  }

  approve()
}

main().catch(() => approve())

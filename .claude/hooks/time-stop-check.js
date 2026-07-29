#!/usr/bin/env node
/**
 * Stop хук — два независимых напоминания про тайм-трекер studio (Фаза 11 §11.5/§11.11 PLAN.md).
 * Первый Stop-хук в репозитории.
 *
 * 1. Незакрытый таймер: если активная запись есть — просим вызвать time_stop/time_pause.
 * 2. Эвристика смен контекста: сравнивает число задетых за сессию apps/<x>/ с числом вызовов
 *    time_switch/time_start (best-effort по транскрипту — возможны ложные срабатывания,
 *    например при чтении чужого приложения для справки без реальной работы над ним).
 *
 * Fail-open во всём: нет TIME_MCP_SECRET, studio недоступен, транскрипт не читается —
 * всегда approve, не блокируем сессию по техническим причинам.
 */

const fs = require('fs')
const readline = require('readline')

const STUDIO_URL = process.env.STUDIO_URL || 'http://localhost:3024'
const SECRET = process.env.TIME_MCP_SECRET

function approve() {
  console.log(JSON.stringify({ decision: 'approve' }))
  process.exit(0)
}

function block(reason) {
  console.log(JSON.stringify({ decision: 'block', reason }))
  process.exit(0)
}

/** Активная запись через /api/mcp/time/status, или null (в т.ч. при любой ошибке). */
async function fetchActiveEntry() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const resp = await fetch(`${STUDIO_URL}/api/mcp/time/status`, {
      headers: { 'X-Time-Mcp-Secret': SECRET },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!resp.ok) {
      return null
    }
    const json = await resp.json()
    return json.data ?? null
  } catch {
    return null
  }
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

  const active = await fetchActiveEntry()
  if (active) {
    const project = active.project?.title ?? active.project?.repoSlug ?? active.projectId ?? '?'
    block(
      `⏱ Таймер тайм-трекера studio всё ещё идёт: проект "${project}", начат ${active.startedAt}. ` +
        'Останови через time_stop (или time_pause, если это время не для счёта клиенту) перед завершением сессии.'
    )
    return
  }

  const { workspaces, switches } = await analyzeTranscript(data.transcript_path)
  // -1: первая рабочая область — стартовый контекст сессии, переключение на неё не требуется
  if (workspaces.size > 1 && switches < workspaces.size - 1) {
    block(
      `🔀 За сессию затронуты приложения: ${[...workspaces].join(', ')} (${workspaces.size}), а ` +
        `time_switch/time_start вызван ${switches} раз(а). Похоже, при смене проекта забыт time_switch — ` +
        'время могло записаться не туда (или не записаться вовсе). Если это ложное срабатывание ' +
        '(например, читал чужой код для справки без реальной работы над ним) — можно продолжить как есть.'
    )
    return
  }

  approve()
}

main().catch(() => approve())

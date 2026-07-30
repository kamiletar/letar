#!/usr/bin/env node
/**
 * PostToolUse хук — heartbeat активного таймера studio (Фаза 11 §11.4 PLAN.md).
 *
 * Обновляет TimeEntry.lastSeenAt на каждый вызов инструмента агентом, вне контекста модели.
 * Это единственный источник heartbeat, на который можно полагаться — тулы time_* тоже
 * обновляют lastSeenAt заодно, но зависят от того, вспомнит ли агент их позвать.
 *
 * Fire-and-forget: короткий таймаут, никогда не блокирует и не падает с ненулевым кодом —
 * если STUDIO_URL/TIME_MCP_SECRET не заданы или studio недоступен, просто ничего не делает
 * (значит трекинг в этой среде не настроен или сессия сейчас не про клиентский проект).
 */

const { getStudioTimeConfig } = require('./lib/studio-time-env')
const { studioUrl: STUDIO_URL, secret: SECRET } = getStudioTimeConfig()

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  input += chunk
})

process.stdin.on('end', async () => {
  if (!SECRET) {
    process.exit(0)
  }

  // sessionRef скоупит heartbeat на активную запись ЭТОЙ сессии (§11 «Q» PLAN.md studio) — без
  // него при параллельных сессиях heartbeat одной держал бы живой таймер другой (или не той).
  // session_id — стандартное поле payload'а PostToolUse-хука, совпадает с CLAUDE_CODE_SESSION_ID,
  // который studio-time-mcp пишет в TimeEntry.sessionRef при старте таймера этой же сессией.
  let sessionRef = ''
  try {
    const data = JSON.parse(input)
    if (typeof data?.session_id === 'string' && data.session_id) {
      sessionRef = `?sessionRef=${encodeURIComponent(data.session_id)}`
    }
  } catch {
    // Нечитаемый payload — шлём heartbeat без sessionRef, ниже он трактуется как null
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1500)
    await fetch(`${STUDIO_URL}/api/mcp/time/heartbeat${sessionRef}`, {
      method: 'POST',
      headers: { 'X-Time-Mcp-Secret': SECRET },
      signal: controller.signal,
    })
    clearTimeout(timeout)
  } catch {
    // studio не запущен/недоступен — не мешаем работе агента
  }

  process.exit(0)
})

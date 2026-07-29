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

const STUDIO_URL = process.env.STUDIO_URL || 'http://localhost:3024'
const SECRET = process.env.TIME_MCP_SECRET

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  input += chunk
})

process.stdin.on('end', async () => {
  if (!SECRET) {
    process.exit(0)
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1500)
    await fetch(`${STUDIO_URL}/api/mcp/time/heartbeat`, {
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

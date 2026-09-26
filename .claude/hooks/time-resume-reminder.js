#!/usr/bin/env node
/**
 * SessionStart хук (matcher: compact|resume) — напоминание про таймер studio после сжатия
 * контекста или возобновления сессии.
 *
 * Сервер мог закрыть запись по простою (autoClosedIdle) в разрыве, а heartbeat закрытую запись
 * не воскрешает. Правило «первым делом time_status» держалось только на памяти модели и
 * нарушалось трижды (time-tracker-drift-incidents.md § 4), поэтому напоминание кладётся в
 * контекст хуком, вне зависимости от того, вспомнит ли модель.
 */

const MESSAGE = 'ТАЙМЕР: контекст сжат или сессия возобновлена, сервер мог закрыть запись по простою. '
  + 'Первым действием, до любого Bash/Read/Edit, вызови time_status. Не идёт — сразу time_start с '
  + 'прежним описанием и, если известно, time_log за потерянный интервал (правило time-tracking.md).'

process.stdin.resume()
process.stdin.on('data', () => {})
process.stdin.on('end', () => {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: MESSAGE } }),
  )
  process.exit(0)
})

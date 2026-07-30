/**
 * MCP-сервер studio-time-mcp — агент сам пишет время работы над проектами клиентов студии.
 * Тонкий HTTP-слой над /api/mcp/time/* в studio, вся бизнес-логика (резолв ставки, отсечка
 * бездействия, идемпотентность) остаётся там — см. apps/studio/src/lib/time-mcp.ts.
 *
 * Фаза 11 §11.4 PLAN.md: time_start/time_stop/time_switch/time_note/time_status/time_log,
 * §11.16 time_discard (бывший time_pause), §11.19 настоящая пауза time_pause/time_resume.
 */

import { errorText, pretty, text } from '@letar/mcp-server-kit'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { studioTimeRequest } from './client.js'

const TIME_KIND = z.enum(['WORK', 'MEETING', 'TRAVEL', 'ADMIN'])

/**
 * Идентификатор текущей сессии Claude Code — привязывает открытый таймер к сессии, которая его
 * открыла (§11 «N» PLAN.md studio). MCP-сервер запускается как дочерний stdio-процесс сессии и
 * наследует её `CLAUDE_CODE_SESSION_ID`. Если переменной нет (запуск вне Claude Code, например
 * вручную для отладки) — best-effort фолбэк на PID процесса, лишь бы не оставлять null там, где
 * есть хоть какой-то способ отличить один запуск сервера от другого.
 */
export function defaultSessionRef(): string {
  return process.env['CLAUDE_CODE_SESSION_ID'] || `pid-${process.pid}`
}

export function createStudioTimeMcpServer(): McpServer {
  const server = new McpServer({ name: '@letar/studio-time-mcp', version: '0.1.0' }, { capabilities: { tools: {} } })

  // ─── time_start ──────────────────────────────────────────────────────────────
  server.tool(
    'time_start',
    [
      'Стартует таймер по приложению (проект резолвится через Project.repoSlug в studio).',
      'Останавливает предыдущий активный таймер, если он был — эквивалент time_switch.',
      'Записи всегда идут черновиком (status: DRAFT) — владелец утверждает их в studio перед выставлением клиенту.',
    ].join('\n'),
    {
      app: z
        .string()
        .min(1)
        .describe('repoSlug приложения (напр. "svoichuzhie") — проект должен быть заведён в studio /owner/projects'),
      description: z
        .string()
        .min(1)
        .max(2000)
        .describe(
          'Чем занимаешься по ЭТОМУ проекту — видит клиент. Без имён других клиентов/проектов, путей к файлам, внутренней кухни',
        ),
      kind: TIME_KIND.optional().describe('Тип активности: WORK (по умолчанию) / MEETING / TRAVEL / ADMIN'),
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          'Ключ идемпотентности — повтор с тем же ключом вернёт существующую запись вместо дубля. Генерируется автоматически, если не передан',
        ),
      sessionRef: z
        .string()
        .optional()
        .describe(
          'Идентификатор сессии, открывшей таймер — используется Stop-хуком, чтобы не блокировать чужую сессию по этому таймеру. По умолчанию берётся из CLAUDE_CODE_SESSION_ID, передавать вручную обычно не нужно',
        ),
    },
    async ({ app, description, kind, idempotencyKey, sessionRef }) => {
      const key = idempotencyKey ?? randomUUID()
      try {
        const res = await studioTimeRequest({
          method: 'POST',
          path: '/api/mcp/time/start',
          body: { app, description, kind, idempotencyKey: key, sessionRef: sessionRef ?? defaultSessionRef() },
        })
        if (!res.ok) {
          return errorText(`❌ time_start(${app}): ${pretty(res.json)}`)
        }
        const warningLine = res.json.warning ? `\n⚠️ ${res.json.warning}\n` : ''
        return text(`⏱ Таймер запущен: **${app}** — ${description}${warningLine}\n${pretty(res.json.data)}`)
      } catch (err) {
        return errorText(`❌ time_start(${app}): ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  // ─── time_switch ─────────────────────────────────────────────────────────────
  server.tool(
    'time_switch',
    [
      'Смена контекста работы — ОБЯЗАТЕЛЬНЫЙ механизм при переходе к другому проекту/приложению',
      '(сессия ≠ проект: одна рабочая сессия часто затрагивает несколько проектов подряд).',
      'Технически идентичен time_start (тот сам останавливает предыдущую запись и стартует новую)',
      '— отдельный тул только ради явной семантики для тебя самого, не ради разного поведения.',
    ].join('\n'),
    {
      app: z.string().min(1).describe('repoSlug приложения, на которое переключаешься'),
      description: z.string().min(1).max(2000).describe('Чем занимаешься теперь — видит клиент'),
      kind: TIME_KIND.optional().describe('Тип активности: WORK (по умолчанию) / MEETING / TRAVEL / ADMIN'),
      idempotencyKey: z.string().optional().describe('Ключ идемпотентности — см. time_start'),
      sessionRef: z.string().optional().describe('Идентификатор сессии — см. time_start'),
    },
    async ({ app, description, kind, idempotencyKey, sessionRef }) => {
      const key = idempotencyKey ?? randomUUID()
      try {
        const res = await studioTimeRequest({
          method: 'POST',
          path: '/api/mcp/time/switch',
          body: { app, description, kind, idempotencyKey: key, sessionRef: sessionRef ?? defaultSessionRef() },
        })
        if (!res.ok) {
          return errorText(`❌ time_switch(${app}): ${pretty(res.json)}`)
        }
        const warningLine = res.json.warning ? `\n⚠️ ${res.json.warning}\n` : ''
        return text(`🔀 Переключено на: **${app}** — ${description}${warningLine}\n${pretty(res.json.data)}`)
      } catch (err) {
        return errorText(`❌ time_switch(${app}): ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  // ─── time_stop ───────────────────────────────────────────────────────────────
  server.tool('time_stop', 'Останавливает текущий активный таймер, если он есть.', {}, async () => {
    try {
      const res = await studioTimeRequest({ method: 'POST', path: '/api/mcp/time/stop' })
      if (!res.ok) {
        return errorText(`❌ time_stop: ${pretty(res.json)}`)
      }
      if (!res.json.data) {
        return text('ℹ️ Активного таймера не было.')
      }
      return text(`⏹ Таймер остановлен.\n\n${pretty(res.json.data)}`)
    } catch (err) {
      return errorText(`❌ time_stop: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // ─── time_pause ──────────────────────────────────────────────────────────────
  server.tool(
    'time_pause',
    [
      'Ставит активный таймер на паузу: запись остаётся открытой, но время перестаёт капать.',
      'Возобновить — time_resume. Зови, когда владелец говорит «пауза» или отвлекается на другое;',
      'на следующем его сообщении сразу вызывай time_resume.',
      'Это НЕ остановка: чтобы закрыть запись, нужен time_stop, а чтобы закрыть небиллируемой — time_discard.',
    ].join('\n'),
    {},
    async () => {
      try {
        const res = await studioTimeRequest({ method: 'POST', path: '/api/mcp/time/pause' })
        if (!res.ok) {
          return errorText(`❌ time_pause: ${pretty(res.json)}`)
        }
        if (!res.json.data) {
          return text('ℹ️ Активного таймера не было.')
        }
        return text(`⏸ Таймер на паузе — время не идёт. Возобновить: time_resume.\n\n${pretty(res.json.data)}`)
      } catch (err) {
        return errorText(`❌ time_pause: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  // ─── time_resume ─────────────────────────────────────────────────────────────
  server.tool(
    'time_resume',
    [
      'Снимает паузу с активного таймера — время снова идёт.',
      'Вызывай сразу, как владелец продолжил взаимодействие после «паузы», не дожидаясь отдельной просьбы.',
    ].join('\n'),
    {},
    async () => {
      try {
        const res = await studioTimeRequest({ method: 'POST', path: '/api/mcp/time/resume' })
        if (!res.ok) {
          return errorText(`❌ time_resume: ${pretty(res.json)}`)
        }
        if (!res.json.data) {
          return text('ℹ️ Активного таймера не было.')
        }
        return text(`▶️ Таймер продолжен.\n\n${pretty(res.json.data)}`)
      } catch (err) {
        return errorText(`❌ time_resume: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  // ─── time_discard ────────────────────────────────────────────────────────────
  server.tool(
    'time_discard',
    [
      'Выключатель: останавливает активный таймер и помечает запись небиллируемой',
      '(billable: false, nonBillReason: INTERNAL). Используй, когда копаешься в проекте из',
      'любопытства или пробуешь подход, который не пойдёт в работу — не оставляй это как обычный time_stop,',
      'иначе владельцу придётся вручную чистить черновик от небиллируемого времени.',
      'Раньше этот инструмент назывался time_pause, хотя ничего не приостанавливал.',
    ].join('\n'),
    {},
    async () => {
      try {
        const res = await studioTimeRequest({ method: 'POST', path: '/api/mcp/time/discard' })
        if (!res.ok) {
          return errorText(`❌ time_discard: ${pretty(res.json)}`)
        }
        if (!res.json.data) {
          return text('ℹ️ Активного таймера не было.')
        }
        return text(`🚫 Таймер остановлен, запись помечена небиллируемой (INTERNAL).\n\n${pretty(res.json.data)}`)
      } catch (err) {
        return errorText(`❌ time_discard: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  // ─── time_note ───────────────────────────────────────────────────────────────
  server.tool(
    'time_note',
    'Уточняет описание активной записи без остановки таймера.',
    { description: z.string().min(1).max(2000).describe('Новое описание — видит клиент') },
    async ({ description }) => {
      try {
        const res = await studioTimeRequest({ method: 'POST', path: '/api/mcp/time/note', body: { description } })
        if (!res.ok) {
          return errorText(`❌ time_note: ${pretty(res.json)}`)
        }
        return text(`📝 Описание обновлено.\n\n${pretty(res.json.data)}`)
      } catch (err) {
        return errorText(`❌ time_note: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  // ─── time_status ─────────────────────────────────────────────────────────────
  server.tool('time_status', 'Что идёт сейчас: активный проект, описание, с какого времени.', {}, async () => {
    try {
      const res = await studioTimeRequest({ path: '/api/mcp/time/status' })
      if (!res.ok) {
        return errorText(`❌ time_status: ${pretty(res.json)}`)
      }
      if (!res.json.data) {
        return text('ℹ️ Таймер сейчас не идёт.')
      }
      return text(`⏱ Идёт таймер:\n\n${pretty(res.json.data)}`)
    } catch (err) {
      return errorText(`❌ time_status: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // ─── time_log ────────────────────────────────────────────────────────────────
  server.tool(
    'time_log',
    'Записывает время задним числом — не трогает активный таймер (например созвон/дорогу, которые не отследил в моменте таймером).',
    {
      app: z.string().min(1).describe('repoSlug приложения'),
      minutes: z
        .number()
        .positive()
        .max(24 * 60)
        .describe('Сколько минут занял этот участок работы'),
      description: z.string().min(1).max(2000).describe('Чем занимался — видит клиент'),
      kind: TIME_KIND.optional().describe('Тип активности: WORK (по умолчанию) / MEETING / TRAVEL / ADMIN'),
      idempotencyKey: z.string().optional().describe('Ключ идемпотентности — см. time_start'),
    },
    async ({ app, minutes, description, kind, idempotencyKey }) => {
      const key = idempotencyKey ?? randomUUID()
      try {
        const res = await studioTimeRequest({
          method: 'POST',
          path: '/api/mcp/time/log',
          body: { app, minutes, description, kind, idempotencyKey: key },
        })
        if (!res.ok) {
          return errorText(`❌ time_log(${app}): ${pretty(res.json)}`)
        }
        return text(
          `📋 Записано задним числом: **${app}**, ${minutes} мин — ${description}\n\n${pretty(res.json.data)}`,
        )
      } catch (err) {
        return errorText(`❌ time_log(${app}): ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  return server
}

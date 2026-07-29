/**
 * MCP-сервер studio-time-mcp — агент сам пишет время работы над проектами клиентов студии.
 * Тонкий HTTP-слой над /api/mcp/time/* в studio, вся бизнес-логика (резолв ставки, отсечка
 * бездействия, идемпотентность) остаётся там — см. apps/studio/src/lib/time-mcp.ts.
 *
 * Фаза 11 §11.4 PLAN.md: time_start/time_stop/time_switch/time_note/time_status/time_log/time_pause.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { studioTimeRequest } from './client.js'

const TIME_KIND = z.enum(['WORK', 'MEETING', 'TRAVEL', 'ADMIN'])

// Обе функции возвращают ОДНУ и ту же форму (с полем isError) без аннотации типа — так вывод
// типов SDK-колбэка работает (см. libs/deploy-mcp/src/server.ts — тот же паттерн, тот же повод).

/** Оборачивает результат в MCP text-content. */
function text(body: string) {
  return { content: [{ type: 'text' as const, text: body }], isError: false as boolean }
}

/** Оборачивает ошибку в MCP isError-ответ с диагностикой. */
function errorText(body: string) {
  return { content: [{ type: 'text' as const, text: body }], isError: true as boolean }
}

/** JSON-представление данных для вывода в чат. */
function pretty(data: unknown): string {
  return '```json\n' + JSON.stringify(data, null, 2) + '\n```'
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
      app: z.string().min(1).describe(
        'repoSlug приложения (напр. "svoichuzhie") — проект должен быть заведён в studio /owner/projects',
      ),
      description: z.string().min(1).max(2000).describe(
        'Чем занимаешься по ЭТОМУ проекту — видит клиент. Без имён других клиентов/проектов, путей к файлам, внутренней кухни',
      ),
      kind: TIME_KIND.optional().describe('Тип активности: WORK (по умолчанию) / MEETING / TRAVEL / ADMIN'),
      idempotencyKey: z.string().optional().describe(
        'Ключ идемпотентности — повтор с тем же ключом вернёт существующую запись вместо дубля. Генерируется автоматически, если не передан',
      ),
    },
    async ({ app, description, kind, idempotencyKey }) => {
      const key = idempotencyKey ?? randomUUID()
      try {
        const res = await studioTimeRequest({
          method: 'POST',
          path: '/api/mcp/time/start',
          body: { app, description, kind, idempotencyKey: key },
        })
        if (!res.ok) {
          return errorText(`❌ time_start(${app}): ${pretty(res.json)}`)
        }
        return text(`⏱ Таймер запущен: **${app}** — ${description}\n\n${pretty(res.json.data)}`)
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
    },
    async ({ app, description, kind, idempotencyKey }) => {
      const key = idempotencyKey ?? randomUUID()
      try {
        const res = await studioTimeRequest({
          method: 'POST',
          path: '/api/mcp/time/switch',
          body: { app, description, kind, idempotencyKey: key },
        })
        if (!res.ok) {
          return errorText(`❌ time_switch(${app}): ${pretty(res.json)}`)
        }
        return text(`🔀 Переключено на: **${app}** — ${description}\n\n${pretty(res.json.data)}`)
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
      'Выключатель: останавливает активный таймер и помечает запись небиллируемой',
      '(billable: false, nonBillReason: INTERNAL). Используй, когда копаешься в проекте из',
      'любопытства или пробуешь подход, который не пойдёт в работу — не оставляй это как обычный time_stop,',
      'иначе владельцу придётся вручную чистить черновик от небиллируемого времени.',
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
        return text(`⏸ Таймер остановлен, запись помечена небиллируемой (INTERNAL).\n\n${pretty(res.json.data)}`)
      } catch (err) {
        return errorText(`❌ time_pause: ${err instanceof Error ? err.message : String(err)}`)
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
      minutes: z.number().positive().max(24 * 60).describe('Сколько минут занял этот участок работы'),
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

/**
 * MCP-сервер studio-time-mcp — агент сам пишет время работы над проектами клиентов студии.
 * Тонкий HTTP-слой над /api/mcp/time/* в studio, вся бизнес-логика (резолв ставки, отсечка
 * бездействия, идемпотентность) остаётся там — см. apps/studio/src/lib/time-mcp.ts.
 *
 * Фаза 11 §11.4 PLAN.md: time_start/time_stop/time_switch/time_note/time_status/time_log,
 * §11.16 time_discard (бывший time_pause), §11.19 настоящая пауза time_pause/time_resume.
 */

import { errorText, pretty, text } from '@letar/mcp-server-kit'
import { McpServer } from '@modelcontextprotocol/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { studioTimeRequest } from './client.js'

const TIME_KIND = z.enum(['WORK', 'MEETING', 'TRAVEL', 'ADMIN'])

/**
 * Формат `startedAt`/`endedAt` у `time_log`: ISO-8601, минуты обязательны, секунды и зона — нет.
 * Здесь только форма строки — ранний отказ без похода в studio. Разбор (без зоны = МСК) и проверки
 * интервала — в studio (`resolveLogInterval`), единственный источник правды.
 */
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/

const MSK_TIME = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
})

/**
 * «23.09, 21:06–23.09, 22:29 МСК (83 мин)» из записи, которую вернул studio — агент сразу видит,
 * куда реально встала запись, а не только сколько минут он передал.
 */
export function formatLogInterval(entry: unknown): string {
  const { startedAt, endedAt, durationSec } = (entry ?? {}) as {
    startedAt?: string
    endedAt?: string
    durationSec?: number
  }
  if (!startedAt || !endedAt) {
    return 'интервал неизвестен'
  }
  const minutes = typeof durationSec === 'number' ? ` (${Math.round(durationSec / 60)} мин)` : ''
  return `${MSK_TIME.format(new Date(startedAt))}–${MSK_TIME.format(new Date(endedAt))} МСК${minutes}`
}

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
  server.registerTool('time_start', {
    description: [
      'Стартует таймер по приложению (проект резолвится через Project.repoSlug в studio).',
      'Останавливает предыдущий активный таймер, если он был — эквивалент time_switch.',
      'Записи всегда идут черновиком (status: DRAFT) — владелец утверждает их в studio перед выставлением клиенту.',
    ].join('\n'),
    inputSchema: z.strictObject({
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
      stage: z
        .string()
        .optional()
        .describe(
          'Название этапа проекта — резолвится среди открытых этапов проекта или заводится новый. '
            + 'Запись времени привяжется к нему. Закрыть этап — time_stage_close',
        ),
    }),
  }, async ({ app, description, kind, idempotencyKey, sessionRef, stage }) => {
    const key = idempotencyKey ?? randomUUID()
    try {
      const res = await studioTimeRequest({
        method: 'POST',
        path: '/api/mcp/time/start',
        body: { app, description, kind, idempotencyKey: key, sessionRef: sessionRef ?? defaultSessionRef(), stage },
      })
      if (!res.ok) {
        return errorText(`❌ time_start(${app}): ${pretty(res.json)}`)
      }
      const warningLine = res.json.warning ? `\n⚠️ ${res.json.warning}\n` : ''
      return text(`⏱ Таймер запущен: **${app}** — ${description}${warningLine}\n${pretty(res.json.data)}`)
    } catch (err) {
      return errorText(`❌ time_start(${app}): ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // ─── time_switch ─────────────────────────────────────────────────────────────
  server.registerTool('time_switch', {
    description: [
      'Смена контекста работы — ОБЯЗАТЕЛЬНЫЙ механизм при переходе к другому проекту/приложению',
      '(сессия ≠ проект: одна рабочая сессия часто затрагивает несколько проектов подряд).',
      'Технически идентичен time_start (тот сам останавливает предыдущую запись и стартует новую)',
      '— отдельный тул только ради явной семантики для тебя самого, не ради разного поведения.',
    ].join('\n'),
    inputSchema: z.strictObject({
      app: z.string().min(1).describe('repoSlug приложения, на которое переключаешься'),
      description: z.string().min(1).max(2000).describe('Чем занимаешься теперь — видит клиент'),
      kind: TIME_KIND.optional().describe('Тип активности: WORK (по умолчанию) / MEETING / TRAVEL / ADMIN'),
      idempotencyKey: z.string().optional().describe('Ключ идемпотентности — см. time_start'),
      sessionRef: z.string().optional().describe('Идентификатор сессии — см. time_start'),
      stage: z.string().optional().describe('Название этапа проекта — см. time_start'),
    }),
  }, async ({ app, description, kind, idempotencyKey, sessionRef, stage }) => {
    const key = idempotencyKey ?? randomUUID()
    try {
      const res = await studioTimeRequest({
        method: 'POST',
        path: '/api/mcp/time/switch',
        body: { app, description, kind, idempotencyKey: key, sessionRef: sessionRef ?? defaultSessionRef(), stage },
      })
      if (!res.ok) {
        return errorText(`❌ time_switch(${app}): ${pretty(res.json)}`)
      }
      const warningLine = res.json.warning ? `\n⚠️ ${res.json.warning}\n` : ''
      return text(`🔀 Переключено на: **${app}** — ${description}${warningLine}\n${pretty(res.json.data)}`)
    } catch (err) {
      return errorText(`❌ time_switch(${app}): ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  const sessionRefField = z
    .string()
    .optional()
    .describe(
      'Идентификатор сессии — см. time_start. По умолчанию берётся из CLAUDE_CODE_SESSION_ID: определяет, '
        + 'какой из ПАРАЛЛЕЛЬНЫХ активных таймеров (свой у каждой сессии/агента, даже на одном проекте) затронуть.',
    )

  // ─── time_stop ───────────────────────────────────────────────────────────────
  server.registerTool('time_stop', {
    description: 'Останавливает активный таймер ЭТОЙ сессии, если он есть.',
    inputSchema: z.strictObject({ sessionRef: sessionRefField }),
  }, async ({ sessionRef }) => {
    try {
      const res = await studioTimeRequest({
        method: 'POST',
        path: '/api/mcp/time/stop',
        body: { sessionRef: sessionRef ?? defaultSessionRef() },
      })
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
  server.registerTool('time_pause', {
    description: [
      'Ставит активный таймер ЭТОЙ сессии на паузу: запись остаётся открытой, но время перестаёт капать.',
      'Возобновить — time_resume. Зови, когда владелец говорит «пауза» или отвлекается на другое;',
      'на следующем его сообщении сразу вызывай time_resume.',
      'Это НЕ остановка: чтобы закрыть запись, нужен time_stop, а чтобы закрыть небиллируемой — time_discard.',
    ].join('\n'),
    inputSchema: z.strictObject({ sessionRef: sessionRefField }),
  }, async ({ sessionRef }) => {
    try {
      const res = await studioTimeRequest({
        method: 'POST',
        path: '/api/mcp/time/pause',
        body: { sessionRef: sessionRef ?? defaultSessionRef() },
      })
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
  })

  // ─── time_resume ─────────────────────────────────────────────────────────────
  server.registerTool('time_resume', {
    description: [
      'Снимает паузу с активного таймера ЭТОЙ сессии — время снова идёт.',
      'Вызывай сразу, как владелец продолжил взаимодействие после «паузы», не дожидаясь отдельной просьбы.',
    ].join('\n'),
    inputSchema: z.strictObject({ sessionRef: sessionRefField }),
  }, async ({ sessionRef }) => {
    try {
      const res = await studioTimeRequest({
        method: 'POST',
        path: '/api/mcp/time/resume',
        body: { sessionRef: sessionRef ?? defaultSessionRef() },
      })
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
  })

  // ─── time_discard ────────────────────────────────────────────────────────────
  server.registerTool('time_discard', {
    description: [
      'Выключатель: останавливает активный таймер ЭТОЙ сессии и помечает запись небиллируемой',
      '(billable: false, nonBillReason: INTERNAL). Используй, когда копаешься в проекте из',
      'любопытства или пробуешь подход, который не пойдёт в работу — не оставляй это как обычный time_stop,',
      'иначе владельцу придётся вручную чистить черновик от небиллируемого времени.',
      'Раньше этот инструмент назывался time_pause, хотя ничего не приостанавливал.',
    ].join('\n'),
    inputSchema: z.strictObject({ sessionRef: sessionRefField }),
  }, async ({ sessionRef }) => {
    try {
      const res = await studioTimeRequest({
        method: 'POST',
        path: '/api/mcp/time/discard',
        body: { sessionRef: sessionRef ?? defaultSessionRef() },
      })
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
  })

  // ─── time_note ───────────────────────────────────────────────────────────────
  server.registerTool('time_note', {
    description: 'Уточняет описание активной записи ЭТОЙ сессии без остановки таймера.',
    inputSchema: z.strictObject({
      description: z.string().min(1).max(2000).describe('Новое описание — видит клиент'),
      sessionRef: sessionRefField,
    }),
  }, async ({ description, sessionRef }) => {
    try {
      const res = await studioTimeRequest({
        method: 'POST',
        path: '/api/mcp/time/note',
        body: { description, sessionRef: sessionRef ?? defaultSessionRef() },
      })
      if (!res.ok) {
        return errorText(`❌ time_note: ${pretty(res.json)}`)
      }
      return text(`📝 Описание обновлено.\n\n${pretty(res.json.data)}`)
    } catch (err) {
      return errorText(`❌ time_note: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // ─── time_status ─────────────────────────────────────────────────────────────
  server.registerTool('time_status', {
    description: 'Что идёт сейчас у ЭТОЙ сессии: активный проект, описание, с какого времени.',
    inputSchema: z.strictObject({ sessionRef: sessionRefField }),
  }, async ({ sessionRef }) => {
    try {
      const res = await studioTimeRequest({
        path: '/api/mcp/time/status',
        query: { sessionRef: sessionRef ?? defaultSessionRef() },
      })
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
  const logMomentField = (what: string) =>
    z
      .string()
      .regex(ISO_DATE_TIME, 'ISO-8601 дата-время, например 2026-09-23T21:06')
      .optional()
      .describe(`${what} — ISO-8601 (2026-09-23T21:06). Без зоны — московское время, с зоной (Z/+03:00) — как есть`)

  server.registerTool('time_log', {
    description: [
      'Записывает время задним числом — не трогает активный таймер (например созвон/дорогу, которые не отследил в моменте таймером).',
      'Интервал задаётся любыми двумя из трёх: startedAt, endedAt, minutes. Только minutes — [сейчас − minutes, сейчас];',
      'только startedAt — до текущего момента. Знаешь реальное время события — передавай startedAt/endedAt,',
      'иначе запись встанет на момент вызова и может перекрыть идущий таймер.',
      'Конец не в будущем, длительность > 0 и не больше суток. Пересечение с другими записями не блокирует — приходит предупреждением.',
    ].join('\n'),
    inputSchema: z.strictObject({
      app: z.string().min(1).describe('repoSlug приложения'),
      minutes: z
        .number()
        .positive()
        .max(24 * 60)
        .optional()
        .describe('Сколько минут занял этот участок работы'),
      startedAt: logMomentField('Начало'),
      endedAt: logMomentField('Конец'),
      description: z.string().min(1).max(2000).describe('Чем занимался — видит клиент'),
      kind: TIME_KIND.optional().describe('Тип активности: WORK (по умолчанию) / MEETING / TRAVEL / ADMIN'),
      idempotencyKey: z.string().optional().describe('Ключ идемпотентности — см. time_start'),
    }),
  }, async ({ app, minutes, startedAt, endedAt, description, kind, idempotencyKey }) => {
    const key = idempotencyKey ?? randomUUID()
    try {
      const res = await studioTimeRequest({
        method: 'POST',
        path: '/api/mcp/time/log',
        body: { app, minutes, startedAt, endedAt, description, kind, idempotencyKey: key },
      })
      if (!res.ok) {
        return errorText(`❌ time_log(${app}): ${pretty(res.json)}`)
      }
      const warningLine = res.json.warning ? `\n⚠️ ${res.json.warning}\n` : ''
      return text(
        `📋 Записано задним числом: **${app}**, ${formatLogInterval(res.json.data)} — ${description}${warningLine}\n${
          pretty(res.json.data)
        }`,
      )
    } catch (err) {
      return errorText(`❌ time_log(${app}): ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // ─── time_stage_close ────────────────────────────────────────────────────────
  server.registerTool('time_stage_close', {
    description: [
      'Закрывает этап проекта (ProjectStage.isDone = true) по названию — этап должен быть',
      'открытым (заведён через параметр stage у time_start/time_switch либо вручную в studio).',
      'Не трогает активный таймер: закрытие этапа и остановка записи времени по нему независимы.',
    ].join('\n'),
    inputSchema: z.strictObject({
      app: z.string().min(1).describe('repoSlug приложения'),
      stage: z.string().min(1).max(300).describe('Название открытого этапа — должно совпадать с тем, что при создании'),
    }),
  }, async ({ app, stage }) => {
    try {
      const res = await studioTimeRequest({
        method: 'POST',
        path: '/api/mcp/time/stage/close',
        body: { app, stage },
      })
      if (!res.ok) {
        return errorText(`❌ time_stage_close(${app}, ${stage}): ${pretty(res.json)}`)
      }
      return text(`✅ Этап закрыт: **${stage}** (${app}).\n\n${pretty(res.json.data)}`)
    } catch (err) {
      return errorText(`❌ time_stage_close(${app}, ${stage}): ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // ─── time_fix_internal_billable ─────────────────────────────────────────────
  server.registerTool('time_fix_internal_billable', {
    description: [
      'Административная правка: помечает небиллируемыми (INTERNAL) все ещё не выставленные в',
      'счёт записи времени по некоммерческим проектам (Project.isCommercial = false) — у таких',
      'проектов нет клиента, платить некому. Не трогает записи, уже вошедшие в выставленный счёт.',
      'Идемпотентен: повторный вызов, когда чинить нечего, вернёт нулевой результат.',
    ].join('\n'),
    inputSchema: z.object({}),
  }, async () => {
    try {
      const res = await studioTimeRequest({ method: 'POST', path: '/api/mcp/time/fix-internal-billable' })
      if (!res.ok) {
        return errorText(`❌ time_fix_internal_billable: ${pretty(res.json)}`)
      }
      return text(`🔧 Правка billable-статуса выполнена.\n\n${pretty(res.json.data)}`)
    } catch (err) {
      return errorText(`❌ time_fix_internal_billable: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  return server
}

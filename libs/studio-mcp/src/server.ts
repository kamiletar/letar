/**
 * MCP-сервер studio-mcp — агент управляет студией напрямую: клиенты, проекты, счета, абонентки.
 * Тонкий HTTP-слой над /api/mcp/admin/* в studio, вся бизнес-логика (валидация, нумерация счетов,
 * пересчёт аванса, email-уведомления) остаётся там — см. apps/studio/src/app/api/mcp/admin/**.
 *
 * Суммы денег в инструментах — в рублях (как человек считает), конвертация в копейки — money.ts.
 */

import { errorText, pretty, text } from '@letar/mcp-server-kit'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { studioAdminRequest } from './client.js'
import { rubToKopecks } from './money.js'

const CLIENT_TYPE = z.enum(['COMPANY', 'SOLE_PROP', 'INDIVIDUAL'])
const PROJECT_STATUS = z.enum(['DISCOVERY', 'IN_PROGRESS', 'REVIEW', 'DONE', 'PAUSED', 'ARCHIVED'])
const BILLING_MODE = z.enum(['FIXED', 'HOURLY'])
const PAYMENT_METHOD = z.enum(['BANK_TRANSFER', 'ACQUIRING', 'SBP'])
const INVOICE_STATUS = z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'])

export function createStudioAdminMcpServer(): McpServer {
  const server = new McpServer({ name: '@letar/studio-mcp', version: '0.1.0' }, { capabilities: { tools: {} } })

  // ─── Клиенты ─────────────────────────────────────────────────────────────────

  server.tool(
    'studio_client_list',
    'Список клиентов студии, с числом проектов и счетов.',
    { search: z.string().optional().describe('Поиск по имени/email') },
    async ({ search }) => {
      const res = await studioAdminRequest({ path: '/api/mcp/admin/clients', query: { search } })
      if (!res.ok) {
        return errorText(`❌ studio_client_list: ${pretty(res.json)}`)
      }
      return text(pretty(res.json.data))
    },
  )

  server.tool(
    'studio_client_get',
    'Карточка клиента: реквизиты, проекты, счётчики счетов/абонентки.',
    { id: z.string().min(1) },
    async ({ id }) => {
      const res = await studioAdminRequest({ path: `/api/mcp/admin/clients/${id}` })
      if (!res.ok) {
        return errorText(`❌ studio_client_get(${id}): ${pretty(res.json)}`)
      }
      return text(pretty(res.json.data))
    },
  )

  const clientFields = {
    type: CLIENT_TYPE.describe('COMPANY (ООО/АО) / SOLE_PROP (ИП) / INDIVIDUAL (физлицо)'),
    name: z.string().min(1).max(200),
    inn: z.string().max(12).optional(),
    kpp: z.string().max(9).optional(),
    ogrn: z.string().max(15).optional(),
    legalAddress: z.string().max(500).optional(),
    email: z.email().optional().describe('Обязателен для INDIVIDUAL — без него нельзя отправить фискальный чек'),
    phone: z.string().max(20).optional(),
    contactPerson: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
  }

  server.tool(
    'studio_client_create',
    'Создаёт нового клиента студии.',
    clientFields,
    async (input) => {
      const res = await studioAdminRequest({ method: 'POST', path: '/api/mcp/admin/clients', body: input })
      if (!res.ok) {
        return errorText(`❌ studio_client_create: ${pretty(res.json)}`)
      }
      return text(`✅ Клиент создан.\n\n${pretty(res.json.data)}`)
    },
  )

  server.tool(
    'studio_client_update',
    'Обновляет клиента (полная замена реквизитов — как форма редактирования, не патч отдельных полей).',
    { id: z.string().min(1), ...clientFields },
    async ({ id, ...input }) => {
      const res = await studioAdminRequest({ method: 'PATCH', path: `/api/mcp/admin/clients/${id}`, body: input })
      if (!res.ok) {
        return errorText(`❌ studio_client_update(${id}): ${pretty(res.json)}`)
      }
      return text(`✅ Клиент обновлён.\n\n${pretty(res.json.data)}`)
    },
  )

  // ─── Проекты ─────────────────────────────────────────────────────────────────

  server.tool(
    'studio_project_list',
    'Список проектов, опционально по клиенту/статусу.',
    { clientId: z.string().optional(), status: PROJECT_STATUS.optional() },
    async ({ clientId, status }) => {
      const res = await studioAdminRequest({ path: '/api/mcp/admin/projects', query: { clientId, status } })
      if (!res.ok) {
        return errorText(`❌ studio_project_list: ${pretty(res.json)}`)
      }
      return text(pretty(res.json.data))
    },
  )

  server.tool(
    'studio_project_get',
    'Карточка проекта: этапы, счётчики счетов/абонентки/учтённого времени.',
    { id: z.string().min(1) },
    async ({ id }) => {
      const res = await studioAdminRequest({ path: `/api/mcp/admin/projects/${id}` })
      if (!res.ok) {
        return errorText(`❌ studio_project_get(${id}): ${pretty(res.json)}`)
      }
      return text(pretty(res.json.data))
    },
  )

  const projectFields = {
    clientId: z.string().min(1),
    title: z.string().min(1).max(300),
    description: z.string().max(5000).optional(),
    status: PROJECT_STATUS,
    budgetRub: z.number().min(0).default(0).describe('Бюджет проекта в рублях (0 — не задан)'),
    billingMode: BILLING_MODE.default('FIXED'),
    rateKopecksPerHour: z.number().int().min(0).optional().describe('Персональная ставка проекта, копеек/час'),
    budgetHours: z.number().int().min(0).optional().describe('Потолок часов по договору'),
    notifyClientOnBudgetAlerts: z.boolean().optional(),
    repoSlug: z.string().max(100).optional().describe('Слаг приложения в монорепо — включает тайм-трекер по нему'),
    isCommercial: z.boolean().optional().describe('Есть реальный клиент с деньгами (не просто внутренняя разведка)'),
    startedAt: z.iso.date().optional(),
    dueAt: z.iso.date().optional(),
  }

  function toProjectApiBody(input: Record<string, unknown>) {
    const { budgetRub, rateKopecksPerHour, ...rest } = input as {
      budgetRub: number
      rateKopecksPerHour?: number
      [key: string]: unknown
    }
    return { ...rest, budget: rubToKopecks(budgetRub), rateKopecks: rateKopecksPerHour ?? null }
  }

  server.tool(
    'studio_project_create',
    'Создаёт проект у клиента.',
    projectFields,
    async (input) => {
      const res = await studioAdminRequest({
        method: 'POST',
        path: '/api/mcp/admin/projects',
        body: toProjectApiBody(input),
      })
      if (!res.ok) {
        return errorText(`❌ studio_project_create: ${pretty(res.json)}`)
      }
      return text(`✅ Проект создан.\n\n${pretty(res.json.data)}`)
    },
  )

  server.tool(
    'studio_project_update',
    'Обновляет проект (полная замена — как форма редактирования).',
    { id: z.string().min(1), ...projectFields },
    async ({ id, ...input }) => {
      const res = await studioAdminRequest({
        method: 'PATCH',
        path: `/api/mcp/admin/projects/${id}`,
        body: toProjectApiBody(input),
      })
      if (!res.ok) {
        return errorText(`❌ studio_project_update(${id}): ${pretty(res.json)}`)
      }
      return text(`✅ Проект обновлён.\n\n${pretty(res.json.data)}`)
    },
  )

  server.tool(
    'studio_project_set_status',
    'Меняет только статус проекта, не трогая остальные поля.',
    { id: z.string().min(1), status: PROJECT_STATUS },
    async ({ id, status }) => {
      const res = await studioAdminRequest({
        method: 'PATCH',
        path: `/api/mcp/admin/projects/${id}/status`,
        body: { status },
      })
      if (!res.ok) {
        return errorText(`❌ studio_project_set_status(${id}): ${pretty(res.json)}`)
      }
      return text(`✅ Статус проекта: ${status}`)
    },
  )

  // ─── Абонентки (RecurringInvoice) ───────────────────────────────────────────

  server.tool(
    'studio_recurring_list',
    'Список абонентских правил (автовыставление счёта — поддержка/подписка), опционально по клиенту.',
    { clientId: z.string().optional() },
    async ({ clientId }) => {
      const res = await studioAdminRequest({ path: '/api/mcp/admin/recurring', query: { clientId } })
      if (!res.ok) {
        return errorText(`❌ studio_recurring_list: ${pretty(res.json)}`)
      }
      return text(pretty(res.json.data))
    },
  )

  server.tool(
    'studio_recurring_get',
    'Карточка абонентского правила.',
    { id: z.string().min(1) },
    async ({ id }) => {
      const res = await studioAdminRequest({ path: `/api/mcp/admin/recurring/${id}` })
      if (!res.ok) {
        return errorText(`❌ studio_recurring_get(${id}): ${pretty(res.json)}`)
      }
      return text(pretty(res.json.data))
    },
  )

  const recurringFields = {
    clientId: z.string().min(1),
    projectId: z.string().optional().describe(
      'Абонентка привязана к конкретному проекту клиента, не к клиенту целиком',
    ),
    itemName: z.string().min(1).max(300).describe('Название позиции в счёте, поддерживает {period} → «июль 2026»'),
    amountRub: z.number().min(0.01).describe('Сумма счёта за цикл, в рублях'),
    regularMonthlyAmountRub: z.number().min(0).optional().describe(
      'Обычная цена/мес — только для отображения скидки при intervalMonths > 1',
    ),
    intervalMonths: z.number().int().min(1).max(12).default(1),
    dueDays: z.number().int().min(0).max(60).default(5),
    includedHoursGrantSec: z.number().int().min(0).optional().describe(
      'Часы, добавляемые в банк проекта за цикл (требует projectId)',
    ),
    nextRunAt: z.iso.date().describe(
      'Дата следующего автовыставления — ПРОШЕДШАЯ дата запускает счёт при ближайшем прогоне крона, СРАЗУ с письмом клиенту',
    ),
    comment: z.string().max(2000).optional(),
  }

  function toRecurringApiBody(input: Record<string, unknown>) {
    const { amountRub, regularMonthlyAmountRub, ...rest } = input as {
      amountRub: number
      regularMonthlyAmountRub?: number
      [key: string]: unknown
    }
    return {
      ...rest,
      amount: rubToKopecks(amountRub),
      regularMonthlyAmount: regularMonthlyAmountRub ? rubToKopecks(regularMonthlyAmountRub) : null,
    }
  }

  server.tool(
    'studio_recurring_create',
    [
      'Создаёт абонентское правило — крон сам будет выставлять и ОТПРАВЛЯТЬ клиенту счёт на nextRunAt',
      'и каждые intervalMonths после. ВАЖНО: если nextRunAt в прошлом или сегодня — первый счёт уйдёт',
      'клиенту письмом при ближайшем прогоне крона, не после подтверждения.',
    ].join(' '),
    recurringFields,
    async (input) => {
      const res = await studioAdminRequest({
        method: 'POST',
        path: '/api/mcp/admin/recurring',
        body: toRecurringApiBody(input),
      })
      if (!res.ok) {
        return errorText(`❌ studio_recurring_create: ${pretty(res.json)}`)
      }
      return text(`✅ Абонентка создана.\n\n${pretty(res.json.data)}`)
    },
  )

  server.tool(
    'studio_recurring_update',
    'Обновляет абонентское правило (полная замена).',
    { id: z.string().min(1), ...recurringFields },
    async ({ id, ...input }) => {
      const res = await studioAdminRequest({
        method: 'PATCH',
        path: `/api/mcp/admin/recurring/${id}`,
        body: toRecurringApiBody(input),
      })
      if (!res.ok) {
        return errorText(`❌ studio_recurring_update(${id}): ${pretty(res.json)}`)
      }
      return text(`✅ Абонентка обновлена.\n\n${pretty(res.json.data)}`)
    },
  )

  server.tool(
    'studio_recurring_toggle',
    'Включает/выключает абонентку без изменения остальных полей — выключенная не выставляет счета.',
    { id: z.string().min(1), active: z.boolean() },
    async ({ id, active }) => {
      const res = await studioAdminRequest({
        method: 'PATCH',
        path: `/api/mcp/admin/recurring/${id}/toggle`,
        body: { active },
      })
      if (!res.ok) {
        return errorText(`❌ studio_recurring_toggle(${id}): ${pretty(res.json)}`)
      }
      return text(`✅ Абонентка ${active ? 'включена' : 'выключена'}.`)
    },
  )

  server.tool(
    'studio_recurring_delete',
    'Удаляет абонентское правило безвозвратно (уже выставленные по нему счета не трогает).',
    { id: z.string().min(1) },
    async ({ id }) => {
      const res = await studioAdminRequest({ method: 'DELETE', path: `/api/mcp/admin/recurring/${id}` })
      if (!res.ok) {
        return errorText(`❌ studio_recurring_delete(${id}): ${pretty(res.json)}`)
      }
      return text('✅ Абонентка удалена.')
    },
  )

  // ─── Счета ───────────────────────────────────────────────────────────────────

  const invoiceItemField = z.object({
    name: z.string().min(1).max(300),
    unit: z.string().max(20).default('усл.'),
    quantity: z.number().int().min(1),
    unitPriceRub: z.number().describe('Цена за единицу, в рублях (может быть отрицательной — скидка/погашение аванса)'),
  })

  server.tool(
    'studio_invoice_list',
    'Список счетов, опционально по клиенту/статусу.',
    { clientId: z.string().optional(), status: INVOICE_STATUS.optional() },
    async ({ clientId, status }) => {
      const res = await studioAdminRequest({ path: '/api/mcp/admin/invoices', query: { clientId, status } })
      if (!res.ok) {
        return errorText(`❌ studio_invoice_list: ${pretty(res.json)}`)
      }
      return text(pretty(res.json.data))
    },
  )

  server.tool(
    'studio_invoice_get',
    'Карточка счёта: позиции, платежи.',
    { id: z.string().min(1) },
    async ({ id }) => {
      const res = await studioAdminRequest({ path: `/api/mcp/admin/invoices/${id}` })
      if (!res.ok) {
        return errorText(`❌ studio_invoice_get(${id}): ${pretty(res.json)}`)
      }
      return text(pretty(res.json.data))
    },
  )

  server.tool(
    'studio_invoice_create',
    'Создаёт счёт в статусе DRAFT (черновик, клиент его ещё не видит) — для отправки см. studio_invoice_send.',
    {
      clientId: z.string().min(1),
      projectId: z.string().optional(),
      paymentMethod: PAYMENT_METHOD.default('BANK_TRANSFER'),
      dueAt: z.iso.date().optional(),
      servicePeriodStart: z.iso.date().optional(),
      servicePeriodEnd: z.iso.date().optional(),
      comment: z.string().max(2000).optional(),
      items: z.array(invoiceItemField).min(1),
    },
    async ({ items, ...rest }) => {
      const apiItems = items.map((item) => {
        const unitPrice = rubToKopecks(item.unitPriceRub)
        return {
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice,
          amount: unitPrice * item.quantity,
        }
      })
      const res = await studioAdminRequest({
        method: 'POST',
        path: '/api/mcp/admin/invoices',
        body: { ...rest, items: apiItems },
      })
      if (!res.ok) {
        return errorText(`❌ studio_invoice_create: ${pretty(res.json)}`)
      }
      return text(`✅ Черновик счёта создан — клиент его ещё не видит.\n\n${pretty(res.json.data)}`)
    },
  )

  server.tool(
    'studio_invoice_send',
    'Переводит черновик в SENT и ОТПРАВЛЯЕТ клиенту письмо со счётом (если у клиента указан email) — необратимо видимое клиенту действие.',
    { id: z.string().min(1) },
    async ({ id }) => {
      const res = await studioAdminRequest({ method: 'POST', path: `/api/mcp/admin/invoices/${id}/send` })
      if (!res.ok) {
        return errorText(`❌ studio_invoice_send(${id}): ${pretty(res.json)}`)
      }
      return text('✅ Счёт отправлен клиенту.')
    },
  )

  server.tool(
    'studio_invoice_cancel',
    'Отменяет неоплаченный счёт (PAID отменить нельзя).',
    { id: z.string().min(1) },
    async ({ id }) => {
      const res = await studioAdminRequest({ method: 'POST', path: `/api/mcp/admin/invoices/${id}/cancel` })
      if (!res.ok) {
        return errorText(`❌ studio_invoice_cancel(${id}): ${pretty(res.json)}`)
      }
      return text('✅ Счёт отменён.')
    },
  )

  return server
}

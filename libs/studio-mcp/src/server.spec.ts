import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { studioAdminRequestMock } = vi.hoisted(() => ({ studioAdminRequestMock: vi.fn() }))

vi.mock('./client.js', () => ({
  studioAdminRequest: studioAdminRequestMock,
}))

import { createStudioAdminMcpServer } from './server.js'

/** Поднимает сервер и подключённого к нему клиента через связанный in-memory транспорт. */
async function connectedClient() {
  const server = createStudioAdminMcpServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'test-client', version: '0.0.0' })
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  return { client, server }
}

function textOf(result: unknown) {
  const content = (result as { content: Array<{ type: string; text?: string }> }).content
  return content.map((c) => c.text).join('\n')
}

/** Невалидные аргументы — MCP-клиент оборачивает protocol-ошибку в isError-результат, не throw. */
async function expectValidationError(client: Client, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args })
  expect(result.isError).toBe(true)
  expect(textOf(result)).toContain('Input validation error')
}

describe('createStudioAdminMcpServer', () => {
  let client: Client

  beforeEach(async () => {
    ;({ client } = await connectedClient())
  })

  afterEach(() => {
    studioAdminRequestMock.mockReset()
  })

  describe('studio_client_list', () => {
    it('успешный вызов возвращает данные клиентов', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: [{ id: 'c1' }] } })

      const result = await client.callTool({ name: 'studio_client_list', arguments: {} })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('"id": "c1"')
      expect(studioAdminRequestMock).toHaveBeenCalledWith({
        path: '/api/mcp/admin/clients',
        query: { search: undefined },
      })
    })

    it('ошибка внешнего вызова (ok:false) возвращает isError', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: false, status: 500, json: { error: 'boom' } })

      const result = await client.callTool({ name: 'studio_client_list', arguments: {} })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('boom')
    })
  })

  describe('studio_client_get', () => {
    it('ошибка валидации — отсутствует обязательный id', async () => {
      await expectValidationError(client, 'studio_client_get', {})
      expect(studioAdminRequestMock).not.toHaveBeenCalled()
    })

    it('404 клиента возвращается как читаемая ошибка, не исключение', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: false, status: 404, json: { error: 'клиент не найден' } })

      const result = await client.callTool({ name: 'studio_client_get', arguments: { id: 'missing' } })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('клиент не найден')
    })
  })

  describe('studio_client_create', () => {
    it('ошибка валидации — пустое имя', async () => {
      await expectValidationError(client, 'studio_client_create', { type: 'COMPANY', name: '' })
      expect(studioAdminRequestMock).not.toHaveBeenCalled()
    })

    it('успешный вызов создаёт клиента', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 'c1' } } })

      const result = await client.callTool({
        name: 'studio_client_create',
        arguments: { type: 'COMPANY', name: 'ООО Ромашка' },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Клиент создан')
      expect(studioAdminRequestMock).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/mcp/admin/clients',
        body: { type: 'COMPANY', name: 'ООО Ромашка' },
      })
    })
  })

  describe('studio_project_create — конвертация рублей в копейки', () => {
    it('переводит budgetRub в budget (копейки) и rateKopecksPerHour в rateKopecks', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 'p1' } } })

      await client.callTool({
        name: 'studio_project_create',
        arguments: {
          clientId: 'c1',
          title: 'Сайт',
          status: 'IN_PROGRESS',
          budgetRub: 1500.5,
          billingMode: 'HOURLY',
          rateKopecksPerHour: 500000,
        },
      })

      expect(studioAdminRequestMock).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/mcp/admin/projects',
        body: expect.objectContaining({
          clientId: 'c1',
          title: 'Сайт',
          budget: 150050,
          rateKopecks: 500000,
        }),
      })
    })

    it('rateKopecksPerHour не задан → rateKopecks: null', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 'p1' } } })

      await client.callTool({
        name: 'studio_project_create',
        arguments: { clientId: 'c1', title: 'Сайт', status: 'DISCOVERY', budgetRub: 0, billingMode: 'FIXED' },
      })

      const body = studioAdminRequestMock.mock.calls[0]?.[0]?.body
      expect(body.rateKopecks).toBeNull()
      expect(body.budget).toBe(0)
    })

    it('ошибка внешнего вызова при создании проекта возвращает isError', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: false, status: 400, json: { error: 'клиент не найден' } })

      const result = await client.callTool({
        name: 'studio_project_create',
        arguments: { clientId: 'missing', title: 'Сайт', status: 'DISCOVERY', budgetRub: 0, billingMode: 'FIXED' },
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('клиент не найден')
    })
  })

  describe('studio_project_set_status', () => {
    it('ошибка валидации — недопустимое значение статуса', async () => {
      await expectValidationError(client, 'studio_project_set_status', { id: 'p1', status: 'UNKNOWN' })
    })

    it('успешный вызов меняет только статус', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: {} })

      const result = await client.callTool({
        name: 'studio_project_set_status',
        arguments: { id: 'p1', status: 'DONE' },
      })

      expect(result.isError).toBeFalsy()
      expect(studioAdminRequestMock).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/mcp/admin/projects/p1/status',
        body: { status: 'DONE' },
      })
    })
  })

  describe('studio_recurring_create — конвертация рублей в копейки', () => {
    it('amountRub → amount, regularMonthlyAmountRub → regularMonthlyAmount', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 'r1' } } })

      await client.callTool({
        name: 'studio_recurring_create',
        arguments: {
          clientId: 'c1',
          itemName: 'Поддержка {period}',
          amountRub: 10000,
          regularMonthlyAmountRub: 12000,
          nextRunAt: '2026-09-01',
        },
      })

      expect(studioAdminRequestMock).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/mcp/admin/recurring',
        body: expect.objectContaining({ amount: 1000000, regularMonthlyAmount: 1200000 }),
      })
    })

    it('regularMonthlyAmountRub не задан → regularMonthlyAmount: null', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 'r1' } } })

      await client.callTool({
        name: 'studio_recurring_create',
        arguments: { clientId: 'c1', itemName: 'Поддержка', amountRub: 5000, nextRunAt: '2026-09-01' },
      })

      const body = studioAdminRequestMock.mock.calls[0]?.[0]?.body
      expect(body.regularMonthlyAmount).toBeNull()
    })

    it('ошибка валидации — amountRub меньше минимума', async () => {
      await expectValidationError(client, 'studio_recurring_create', {
        clientId: 'c1',
        itemName: 'Поддержка',
        amountRub: 0,
        nextRunAt: '2026-09-01',
      })
      expect(studioAdminRequestMock).not.toHaveBeenCalled()
    })
  })

  describe('studio_recurring_toggle', () => {
    it('успешный вызов включает абонентку', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: {} })

      const result = await client.callTool({
        name: 'studio_recurring_toggle',
        arguments: { id: 'r1', active: true },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('включена')
    })

    it('ошибка внешнего вызова возвращает isError', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: false, status: 404, json: { error: 'не найдена' } })

      const result = await client.callTool({
        name: 'studio_recurring_toggle',
        arguments: { id: 'missing', active: false },
      })

      expect(result.isError).toBe(true)
    })
  })

  describe('studio_invoice_create — пересчёт позиций', () => {
    it('переводит unitPriceRub в unitPrice и считает amount = unitPrice * quantity', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 'i1' } } })

      await client.callTool({
        name: 'studio_invoice_create',
        arguments: {
          clientId: 'c1',
          items: [{ name: 'Разработка', unit: 'усл.', quantity: 3, unitPriceRub: 1500 }],
        },
      })

      expect(studioAdminRequestMock).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/mcp/admin/invoices',
        body: expect.objectContaining({
          clientId: 'c1',
          items: [{ name: 'Разработка', unit: 'усл.', quantity: 3, unitPrice: 150000, amount: 450000 }],
        }),
      })
    })

    it('поддерживает отрицательную цену позиции (скидка/погашение аванса)', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 'i1' } } })

      await client.callTool({
        name: 'studio_invoice_create',
        arguments: {
          clientId: 'c1',
          items: [{ name: 'Аванс (погашение)', unit: 'усл.', quantity: 1, unitPriceRub: -5000 }],
        },
      })

      const body = studioAdminRequestMock.mock.calls[0]?.[0]?.body
      expect(body.items[0]).toMatchObject({ unitPrice: -500000, amount: -500000 })
    })

    it('ошибка валидации — пустой массив позиций', async () => {
      await expectValidationError(client, 'studio_invoice_create', { clientId: 'c1', items: [] })
      expect(studioAdminRequestMock).not.toHaveBeenCalled()
    })
  })

  describe('studio_invoice_send', () => {
    it('успешный вызов отправляет счёт', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: {} })

      const result = await client.callTool({ name: 'studio_invoice_send', arguments: { id: 'i1' } })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('отправлен')
      expect(studioAdminRequestMock).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/mcp/admin/invoices/i1/send',
      })
    })

    it('ошибка внешнего вызова (уже отправлен) возвращает isError', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: false, status: 409, json: { error: 'уже отправлен' } })

      const result = await client.callTool({ name: 'studio_invoice_send', arguments: { id: 'i1' } })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('уже отправлен')
    })
  })

  describe('studio_invoice_cancel', () => {
    it('успешный вызов отменяет счёт', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: {} })

      const result = await client.callTool({ name: 'studio_invoice_cancel', arguments: { id: 'i1' } })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('отменён')
    })

    it('PAID счёт нельзя отменить — ошибка внешнего вызова', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: false, status: 400, json: { error: 'счёт уже оплачен' } })

      const result = await client.callTool({ name: 'studio_invoice_cancel', arguments: { id: 'i1' } })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('счёт уже оплачен')
    })
  })

  describe('studio_recurring_delete', () => {
    it('успешный вызов удаляет абонентку', async () => {
      studioAdminRequestMock.mockResolvedValue({ ok: true, status: 200, json: {} })

      const result = await client.callTool({ name: 'studio_recurring_delete', arguments: { id: 'r1' } })

      expect(result.isError).toBeFalsy()
      expect(studioAdminRequestMock).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/mcp/admin/recurring/r1',
      })
    })
  })
})

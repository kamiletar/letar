import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createPayment, createRefund, getPayment, isYooKassaIp } from './yookassa'

// === Мок fetch ===

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  vi.stubEnv('YOOKASSA_SHOP_ID', 'test-shop-id')
  vi.stubEnv('YOOKASSA_SECRET_KEY', 'test-secret-key')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('isYooKassaIp', () => {
  describe('разрешённые CIDR диапазоны', () => {
    it('185.71.76.1 (185.71.76.0/27)', () => {
      expect(isYooKassaIp('185.71.76.1')).toBe(true)
    })

    it('185.71.76.31 (граница /27)', () => {
      expect(isYooKassaIp('185.71.76.31')).toBe(true)
    })

    it('185.71.77.0 (185.71.77.0/27)', () => {
      expect(isYooKassaIp('185.71.77.0')).toBe(true)
    })

    it('77.75.153.0 (77.75.153.0/25)', () => {
      expect(isYooKassaIp('77.75.153.0')).toBe(true)
    })

    it('77.75.153.127 (граница /25)', () => {
      expect(isYooKassaIp('77.75.153.127')).toBe(true)
    })

    it('77.75.156.11 (/32)', () => {
      expect(isYooKassaIp('77.75.156.11')).toBe(true)
    })

    it('77.75.156.35 (/32)', () => {
      expect(isYooKassaIp('77.75.156.35')).toBe(true)
    })

    it('77.75.154.128 (77.75.154.128/25)', () => {
      expect(isYooKassaIp('77.75.154.128')).toBe(true)
    })

    it('77.75.154.255 (граница /25)', () => {
      expect(isYooKassaIp('77.75.154.255')).toBe(true)
    })
  })

  describe('запрещённые IP', () => {
    it('192.168.1.1 → false', () => {
      expect(isYooKassaIp('192.168.1.1')).toBe(false)
    })

    it('185.71.76.32 (за границей /27) → false', () => {
      expect(isYooKassaIp('185.71.76.32')).toBe(false)
    })

    it('77.75.156.12 (рядом с /32) → false', () => {
      expect(isYooKassaIp('77.75.156.12')).toBe(false)
    })
  })

  describe('IPv6-mapped адреса', () => {
    it('::ffff:185.71.76.1 → true', () => {
      expect(isYooKassaIp('::ffff:185.71.76.1')).toBe(true)
    })

    it('::ffff:192.168.1.1 → false', () => {
      expect(isYooKassaIp('::ffff:192.168.1.1')).toBe(false)
    })
  })

  describe('localhost в development', () => {
    it('127.0.0.1 разрешён в development', () => {
      vi.stubEnv('NODE_ENV', 'development')
      expect(isYooKassaIp('127.0.0.1')).toBe(true)
    })

    it('::1 разрешён в development', () => {
      vi.stubEnv('NODE_ENV', 'development')
      expect(isYooKassaIp('::1')).toBe(true)
    })

    it('::ffff:127.0.0.1 разрешён в development', () => {
      vi.stubEnv('NODE_ENV', 'development')
      expect(isYooKassaIp('::ffff:127.0.0.1')).toBe(true)
    })

    it('127.0.0.1 запрещён в production', () => {
      vi.stubEnv('NODE_ENV', 'production')
      expect(isYooKassaIp('127.0.0.1')).toBe(false)
    })
  })
})

describe('createPayment', () => {
  it('отправляет POST с правильным URL и body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pay-123', status: 'pending' }),
    })

    const result = await createPayment({
      amount: 5000,
      description: 'Заказ ORD-123',
      returnUrl: 'https://example.com/success',
      idempotenceKey: 'key-1',
    })

    expect(mockFetch).toHaveBeenCalledWith('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: expect.stringContaining('Basic '),
        'Idempotence-Key': 'key-1',
      },
      body: expect.any(String),
    })

    // Проверяем body
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.amount).toEqual({ value: '5000.00', currency: 'RUB' })
    expect(body.capture).toBe(true)
    expect(body.description).toBe('Заказ ORD-123')
    expect(body.confirmation.return_url).toBe('https://example.com/success')

    expect(result).toEqual({ id: 'pay-123', status: 'pending' })
  })

  it('Authorization Basic корректный (base64 от shopId:secretKey)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pay-1' }),
    })

    await createPayment({ amount: 100, description: 'test', returnUrl: 'http://x' })

    const authHeader = mockFetch.mock.calls[0][1].headers.Authorization
    const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString()
    expect(decoded).toBe('test-shop-id:test-secret-key')
  })

  it('генерирует idempotenceKey если не передан', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pay-1' }),
    })

    await createPayment({ amount: 100, description: 'test', returnUrl: 'http://x' })

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['Idempotence-Key']).toBeTruthy()
    expect(headers['Idempotence-Key'].length).toBeGreaterThan(0)
  })

  it('выбрасывает ошибку при неуспешном ответе API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad request',
    })

    await expect(createPayment({ amount: 100, description: 'test', returnUrl: 'http://x' })).rejects.toThrow(
      'ЮKassa API error: 400 Bad request'
    )
  })

  it('выбрасывает ошибку если нет env переменных', async () => {
    vi.stubEnv('YOOKASSA_SHOP_ID', '')
    vi.stubEnv('YOOKASSA_SECRET_KEY', '')

    await expect(createPayment({ amount: 100, description: 'test', returnUrl: 'http://x' })).rejects.toThrow(
      'YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY должны быть заданы в .env'
    )
  })

  it('capture: false для двухстадийной оплаты', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pay-1' }),
    })

    await createPayment({ amount: 100, description: 'test', returnUrl: 'http://x', capture: false })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.capture).toBe(false)
  })
})

describe('getPayment', () => {
  it('отправляет GET с правильным URL и Authorization', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pay-123', status: 'succeeded' }),
    })

    const result = await getPayment('pay-123')

    expect(mockFetch).toHaveBeenCalledWith('https://api.yookassa.ru/v3/payments/pay-123', {
      headers: { Authorization: expect.stringContaining('Basic ') },
    })
    expect(result).toEqual({ id: 'pay-123', status: 'succeeded' })
  })

  it('выбрасывает ошибку при неуспешном ответе', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not found',
    })

    await expect(getPayment('pay-999')).rejects.toThrow('ЮKassa API error: 404 Not found')
  })
})

describe('createRefund', () => {
  it('отправляет POST /refunds с правильным body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'ref-1', status: 'succeeded' }),
    })

    const result = await createRefund({
      paymentId: 'pay-123',
      amount: 1000,
      description: 'Возврат',
    })

    expect(mockFetch).toHaveBeenCalledWith('https://api.yookassa.ru/v3/refunds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: expect.stringContaining('Basic '),
        'Idempotence-Key': expect.any(String),
      },
      body: expect.any(String),
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.payment_id).toBe('pay-123')
    expect(body.amount).toEqual({ value: '1000.00', currency: 'RUB' })
    expect(body.description).toBe('Возврат')

    expect(result).toEqual({ id: 'ref-1', status: 'succeeded' })
  })

  it('генерирует idempotenceKey если не передан', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'ref-1' }),
    })

    await createRefund({ paymentId: 'pay-1', amount: 100 })

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['Idempotence-Key']).toBeTruthy()
  })

  it('передаёт пользовательский idempotenceKey', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'ref-1' }),
    })

    await createRefund({ paymentId: 'pay-1', amount: 100, idempotenceKey: 'custom-key' })

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['Idempotence-Key']).toBe('custom-key')
  })

  it('выбрасывает ошибку при неуспешном ответе', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal error',
    })

    await expect(createRefund({ paymentId: 'pay-1', amount: 100 })).rejects.toThrow(
      'ЮKassa Refund API error: 500 Internal error'
    )
  })
})

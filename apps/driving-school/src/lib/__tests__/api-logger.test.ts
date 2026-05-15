import type { RateLimitResult } from '@letar/api-server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createApiLogger,
  extractEndpoint,
  extractQueryParams,
  getClientIp,
  getResponseSize,
  logApiRequest,
} from '../api-logger'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    apiLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

describe('API Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Группа 1: Извлечение данных из запроса', () => {
    it('getClientIp — извлекает IP из x-forwarded-for', () => {
      const request = new Request('https://example.com/api', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe('192.168.1.1')
    })

    it('getClientIp — извлекает IP из x-real-ip', () => {
      const request = new Request('https://example.com/api', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe('192.168.1.2')
    })

    it('getClientIp — извлекает IP из cf-connecting-ip', () => {
      const request = new Request('https://example.com/api', {
        headers: {
          'cf-connecting-ip': '192.168.1.3',
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe('192.168.1.3')
    })

    it('getClientIp — возвращает null если IP отсутствует', () => {
      const request = new Request('https://example.com/api')
      const ip = getClientIp(request)
      expect(ip).toBeNull()
    })

    it('extractEndpoint — извлекает pathname без query параметров', () => {
      const request = new Request('https://example.com/api/v1/students?page=1&limit=10')
      const endpoint = extractEndpoint(request)
      expect(endpoint).toBe('/api/v1/students')
    })

    it('extractQueryParams — извлекает query параметры', () => {
      const request = new Request('https://example.com/api/v1/students?page=1&limit=10')
      const params = extractQueryParams(request)
      expect(params).toEqual({ page: '1', limit: '10' })
    })

    it('extractQueryParams — возвращает null если параметры отсутствуют', () => {
      const request = new Request('https://example.com/api/v1/students')
      const params = extractQueryParams(request)
      expect(params).toBeNull()
    })
  })

  describe('Группа 2: Размер ответа', () => {
    it('getResponseSize — вычисляет размер JSON ответа', () => {
      const body = { data: [{ id: 1, name: 'Test' }] }
      const size = getResponseSize(body)
      expect(size).toBeGreaterThan(0)
      expect(size).toBeLessThan(100)
    })

    it('getResponseSize — возвращает 0 для невалидного JSON', () => {
      const body = { circular: {} }
      // @ts-expect-error Testing circular reference
      body.circular.ref = body
      const size = getResponseSize(body)
      expect(size).toBe(0)
    })
  })

  describe('Группа 3: Логирование запроса', () => {
    it('logApiRequest — создаёт запись в БД с основными полями', async () => {
      const { prisma } = await import('@/lib/db')

      logApiRequest(
        {
          apiKeyId: 'key-123',
          organizationId: 'org-456',
          method: 'GET',
          endpoint: '/api/v1/students',
        },
        {
          statusCode: 200,
        },
        150
      )

      // Даём время на async операцию
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(prisma.apiLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          apiKeyId: 'key-123',
          organizationId: 'org-456',
          method: 'GET',
          endpoint: '/api/v1/students',
          statusCode: 200,
          responseTimeMs: 150,
        }),
      })
    })

    it('logApiRequest — логирует rate limit данные', async () => {
      const { prisma } = await import('@/lib/db')

      const rateLimit: RateLimitResult = {
        allowed: true,
        limit: 100,
        remaining: 99,
        resetAt: 1234567890,
      }

      logApiRequest(
        {
          apiKeyId: 'key-123',
          organizationId: 'org-456',
          method: 'GET',
          endpoint: '/api/v1/students',
        },
        {
          statusCode: 200,
          rateLimit,
        },
        150
      )

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(prisma.apiLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rateLimitLimit: 100,
          rateLimitRemaining: 99,
        }),
      })
    })

    it('logApiRequest — логирует ошибки', async () => {
      const { prisma } = await import('@/lib/db')

      logApiRequest(
        {
          apiKeyId: 'key-123',
          organizationId: 'org-456',
          method: 'POST',
          endpoint: '/api/v1/students',
        },
        {
          statusCode: 400,
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Invalid email format',
        },
        50
      )

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(prisma.apiLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          statusCode: 400,
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Invalid email format',
        }),
      })
    })

    it('logApiRequest — логирует query параметры', async () => {
      const { prisma } = await import('@/lib/db')

      logApiRequest(
        {
          apiKeyId: 'key-123',
          organizationId: 'org-456',
          method: 'GET',
          endpoint: '/api/v1/students',
          queryParams: { page: '1', limit: '10' },
        },
        {
          statusCode: 200,
        },
        150
      )

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(prisma.apiLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          queryParams: { page: '1', limit: '10' },
        }),
      })
    })

    it('logApiRequest — не падает при ошибке БД', async () => {
      const { prisma } = await import('@/lib/db')
      const mockCreate = prisma.apiLog.create as ReturnType<typeof vi.fn>
      mockCreate.mockRejectedValueOnce(new Error('DB error'))

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
        /* noop */
      })

      // Не должно выбросить исключение
      expect(() => {
        logApiRequest(
          {
            apiKeyId: 'key-123',
            organizationId: 'org-456',
            method: 'GET',
            endpoint: '/api/v1/students',
          },
          {
            statusCode: 200,
          },
          150
        )
      }).not.toThrow()

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(consoleError).toHaveBeenCalledWith('Ошибка логирования API запроса:', expect.any(Error))

      consoleError.mockRestore()
    })
  })

  describe('Группа 4: createApiLogger', () => {
    it('createApiLogger — извлекает данные из запроса', () => {
      const request = new Request('https://example.com/api/v1/students?page=1', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
      })

      const logger = createApiLogger(request)

      expect(logger.method).toBe('GET')
      expect(logger.endpoint).toBe('/api/v1/students')
      expect(logger.queryParams).toEqual({ page: '1' })
      expect(logger.ipAddress).toBe('192.168.1.1')
      expect(logger.userAgent).toBe('Mozilla/5.0')
    })

    it('createApiLogger.log — вызывает logApiRequest с правильными параметрами', async () => {
      const { prisma } = await import('@/lib/db')
      const request = new Request('https://example.com/api/v1/students')
      const logger = createApiLogger(request)

      logger.log('key-123', 'org-456', {
        statusCode: 200,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(prisma.apiLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          apiKeyId: 'key-123',
          organizationId: 'org-456',
          method: 'GET',
          endpoint: '/api/v1/students',
          statusCode: 200,
          responseTimeMs: expect.any(Number),
        }),
      })
    })

    it('createApiLogger.logAuthError — не логирует без apiKeyId', async () => {
      const request = new Request('https://example.com/api/v1/students')
      const logger = createApiLogger(request)

      // Не должно вызвать logApiRequest
      logger.logAuthError(undefined, 'org-456', {
        statusCode: 401,
        errorCode: 'INVALID_API_KEY',
      })

      // Проверяем что prisma.apiLog.create не был вызван
      const { prisma: mockPrisma1 } = await import('@/lib/db')
      expect(mockPrisma1.apiLog.create).not.toHaveBeenCalled()
    })

    it('createApiLogger.logAuthError — не логирует без organizationId', async () => {
      const request = new Request('https://example.com/api/v1/students')
      const logger = createApiLogger(request)

      logger.logAuthError('key-123', undefined, {
        statusCode: 401,
        errorCode: 'INVALID_API_KEY',
      })

      const { prisma: mockPrisma2 } = await import('@/lib/db')
      expect(mockPrisma2.apiLog.create).not.toHaveBeenCalled()
    })

    it('createApiLogger.logAuthError — логирует с валидными идентификаторами', async () => {
      const { prisma } = await import('@/lib/db')
      const request = new Request('https://example.com/api/v1/students')
      const logger = createApiLogger(request)

      logger.logAuthError('key-123', 'org-456', {
        statusCode: 401,
        errorCode: 'INVALID_API_KEY',
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(prisma.apiLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          apiKeyId: 'key-123',
          organizationId: 'org-456',
          statusCode: 401,
          errorCode: 'INVALID_API_KEY',
        }),
      })
    })
  })
})

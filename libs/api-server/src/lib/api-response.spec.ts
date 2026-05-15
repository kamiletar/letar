import { describe, expect, it } from 'vitest'

import { apiError, apiSuccess, getRateLimitHeaders } from './api-response'

describe('apiError', () => {
  it('создаёт ответ с ошибкой', () => {
    const result = apiError('Что-то пошло не так', 500)

    expect(result).toEqual({
      body: { error: 'Что-то пошло не так' },
      status: 500,
    })
  })

  it('добавляет код ошибки если передан', () => {
    const result = apiError('Не найдено', 404, 'NOT_FOUND')

    expect(result).toEqual({
      body: { error: 'Не найдено', code: 'NOT_FOUND' },
      status: 404,
    })
  })

  it('не добавляет code если не передан', () => {
    const result = apiError('Ошибка', 400)

    expect(result.body).not.toHaveProperty('code')
  })
})

describe('apiSuccess', () => {
  it('создаёт успешный ответ с данными', () => {
    const data = { id: 1, name: 'Тест' }
    const result = apiSuccess(data)

    expect(result).toEqual({
      body: { data },
      status: 200,
    })
  })

  it('добавляет meta если передан', () => {
    const data = [{ id: 1 }, { id: 2 }]
    const meta = { total: 100, page: 1, limit: 10 }
    const result = apiSuccess(data, meta)

    expect(result).toEqual({
      body: { data, meta },
      status: 200,
    })
  })

  it('не добавляет meta если не передан', () => {
    const result = apiSuccess({ test: true })

    expect(result.body).not.toHaveProperty('meta')
  })

  it('работает с разными типами данных', () => {
    // Массив
    expect(apiSuccess([1, 2, 3]).body.data).toEqual([1, 2, 3])

    // Строка
    expect(apiSuccess('hello').body.data).toBe('hello')

    // null
    expect(apiSuccess(null).body.data).toBeNull()
  })
})

describe('getRateLimitHeaders', () => {
  it('возвращает пустой объект если rateLimit не передан', () => {
    expect(getRateLimitHeaders()).toEqual({})
    expect(getRateLimitHeaders(undefined)).toEqual({})
  })

  it('возвращает заголовки rate limit', () => {
    const rateLimit = {
      allowed: true,
      limit: 100,
      remaining: 95,
      resetAt: 1704067200000,
    }

    const headers = getRateLimitHeaders(rateLimit)

    expect(headers).toEqual({
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '95',
      'X-RateLimit-Reset': '1704067200000',
    })
  })

  it('добавляет Retry-After если есть retryAfter', () => {
    const rateLimit = {
      allowed: false,
      limit: 100,
      remaining: 0,
      resetAt: 1704067200000,
      retryAfter: 30,
    }

    const headers = getRateLimitHeaders(rateLimit)

    expect(headers['Retry-After']).toBe('30')
  })

  it('не добавляет отрицательный remaining', () => {
    const rateLimit = {
      allowed: false,
      limit: 100,
      remaining: -5,
      resetAt: 1704067200000,
    }

    const headers = getRateLimitHeaders(rateLimit)

    expect(headers['X-RateLimit-Remaining']).toBe('0')
  })
})

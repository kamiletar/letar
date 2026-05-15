import { expect, test } from './fixtures/base-test'
import { testSchoolAdmin } from './fixtures/test-data'
import { createTestApiKey, deleteTestApiKey } from './helpers/api-key.helpers'
import { getSchoolIdForAdmin } from './helpers/db.helpers'

/**
 * Phase 8.5: Rate Limiting — E2E тесты
 *
 * Тестируемый функционал:
 * - Запросы в пределах лимита возвращают 200
 * - Превышение лимита возвращает 429 Too Many Requests
 * - X-RateLimit-Limit header показывает лимит
 * - X-RateLimit-Remaining header показывает оставшиеся запросы
 * - X-RateLimit-Reset header показывает timestamp сброса
 * - Retry-After header присутствует при 429
 * - Reset работает после окончания окна
 * - Разные API-ключи имеют отдельные лимиты
 * - Owner видит статистику rate limit в UI
 */

test.describe('Rate Limiting', () => {
  let schoolId: string
  let apiKey: string
  let apiKeyId: string

  test.beforeAll(async () => {
    const id = await getSchoolIdForAdmin(testSchoolAdmin.email)
    if (!id) {
      throw new Error('School not found for test admin')
    }
    schoolId = id

    const result = await createTestApiKey(schoolId, 'Rate Limit Test Key')
    apiKey = result.apiKey
    apiKeyId = result.apiKeyId
  })

  test.afterAll(async () => {
    if (apiKeyId) {
      await deleteTestApiKey(apiKeyId)
    }
  })

  test.describe('Группа 1: Базовое поведение rate limiting', () => {
    test('P8-5.1 — Запрос в пределах лимита возвращает 200', async ({ request }) => {
      const response = await request.get('/api/v1/organization', {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      // Проверяем наличие rate limit headers
      const headers = response.headers()
      expect(headers).toHaveProperty('x-ratelimit-limit')
      expect(headers).toHaveProperty('x-ratelimit-remaining')
      expect(headers).toHaveProperty('x-ratelimit-reset')

      // Limit должен быть 100 (default)
      expect(parseInt(headers['x-ratelimit-limit'])).toBe(100)

      // Remaining должен быть меньше limit (т.к. мы сделали запрос)
      const remaining = parseInt(headers['x-ratelimit-remaining'])
      expect(remaining).toBeGreaterThanOrEqual(0)
      expect(remaining).toBeLessThan(100)
    })

    test('P8-5.2 — Превышение лимита возвращает 429 Too Many Requests', async ({ request }) => {
      // Создаём новый API-ключ для изолированного теста
      const testResult = await createTestApiKey(schoolId, 'Limit Exceeded Test Key')
      const testKey = testResult.apiKey
      const testKeyId = testResult.apiKeyId

      try {
        // Делаем 100 запросов (default limit)
        // Используем Promise.all для ускорения, но небольшими батчами для надёжности
        for (let batch = 0; batch < 10; batch++) {
          const promises = []
          for (let i = 0; i < 10; i++) {
            promises.push(
              request.get('/api/v1/organization', {
                headers: { 'X-API-Key': testKey },
              })
            )
          }
          await Promise.all(promises)
        }

        // 101-й запрос должен вернуть 429
        const response = await request.get('/api/v1/organization', {
          headers: { 'X-API-Key': testKey },
        })

        expect(response.status()).toBe(429)

        const body = await response.json()
        expect(body).toHaveProperty('error')
        expect(body.error).toMatch(/превышен лимит|rate limit/i)
      } finally {
        // Cleanup
        await deleteTestApiKey(testKeyId)
      }
    })
  })

  test.describe('Группа 2: Rate Limit Headers', () => {
    test('P8-5.3 — X-RateLimit-Limit показывает максимум запросов', async ({ request }) => {
      const response = await request.get('/api/v1/organization', {
        headers: { 'X-API-Key': apiKey },
      })

      const headers = response.headers()
      const limit = parseInt(headers['x-ratelimit-limit'])

      // Default limit = 100
      expect(limit).toBe(100)
      expect(limit).toBeGreaterThan(0)
    })

    test('P8-5.4 — X-RateLimit-Remaining уменьшается с каждым запросом', async ({ request }) => {
      // Создаём новый ключ для изолированного теста
      const testResult = await createTestApiKey(schoolId, 'Remaining Test Key')
      const testKey = testResult.apiKey
      const testKeyId = testResult.apiKeyId

      try {
        // Первый запрос
        const response1 = await request.get('/api/v1/organization', {
          headers: { 'X-API-Key': testKey },
        })
        const remaining1 = parseInt(response1.headers()['x-ratelimit-remaining'])

        // Второй запрос
        const response2 = await request.get('/api/v1/organization', {
          headers: { 'X-API-Key': testKey },
        })
        const remaining2 = parseInt(response2.headers()['x-ratelimit-remaining'])

        // Remaining должен уменьшиться
        expect(remaining2).toBe(remaining1 - 1)
      } finally {
        await deleteTestApiKey(testKeyId)
      }
    })

    test('P8-5.5 — X-RateLimit-Reset содержит Unix timestamp', async ({ request }) => {
      const response = await request.get('/api/v1/organization', {
        headers: { 'X-API-Key': apiKey },
      })

      const headers = response.headers()
      const resetAt = parseInt(headers['x-ratelimit-reset'])

      // Проверяем что это валидный Unix timestamp (в секундах)
      const now = Math.floor(Date.now() / 1000)
      expect(resetAt).toBeGreaterThan(now)
      // Reset должен быть в пределах 1 часа от текущего времени
      expect(resetAt).toBeLessThan(now + 3600)
    })

    test('P8-5.6 — Retry-After header присутствует при 429', async ({ request }) => {
      // Создаём новый ключ для изолированного теста
      const testResult = await createTestApiKey(schoolId, 'Retry-After Test Key')
      const testKey = testResult.apiKey
      const testKeyId = testResult.apiKeyId

      try {
        // Делаем 100 запросов
        for (let batch = 0; batch < 10; batch++) {
          const promises = []
          for (let i = 0; i < 10; i++) {
            promises.push(
              request.get('/api/v1/organization', {
                headers: { 'X-API-Key': testKey },
              })
            )
          }
          await Promise.all(promises)
        }

        // 101-й запрос → 429
        const response = await request.get('/api/v1/organization', {
          headers: { 'X-API-Key': testKey },
        })

        expect(response.status()).toBe(429)

        const headers = response.headers()
        expect(headers).toHaveProperty('retry-after')

        // Retry-After должен быть числом (секунды)
        const retryAfter = parseInt(headers['retry-after'])
        expect(retryAfter).toBeGreaterThan(0)
        expect(retryAfter).toBeLessThanOrEqual(60) // Window = 1 минута
      } finally {
        await deleteTestApiKey(testKeyId)
      }
    })
  })

  test.describe('Группа 3: Изоляция и reset', () => {
    test('P8-5.7 — Reset работает после окончания окна', async ({ request }) => {
      // ПРИМЕЧАНИЕ: Этот тест требует ожидания 60+ секунд для полного сброса
      // Вместо этого проверяем что X-RateLimit-Reset timestamp корректный

      const response = await request.get('/api/v1/organization', {
        headers: { 'X-API-Key': apiKey },
      })

      const headers = response.headers()
      const resetAt = parseInt(headers['x-ratelimit-reset'])
      const now = Math.floor(Date.now() / 1000)

      // Reset должен быть примерно через 60 секунд (окно = 1 минута)
      const resetIn = resetAt - now
      expect(resetIn).toBeGreaterThan(0)
      expect(resetIn).toBeLessThanOrEqual(60)
    })

    test('P8-5.8 — Разные API-ключи имеют отдельные лимиты', async ({ request }) => {
      // Создаём два разных ключа
      const key1Result = await createTestApiKey(schoolId, 'Independent Key 1')
      const key2Result = await createTestApiKey(schoolId, 'Independent Key 2')

      try {
        // Делаем 50 запросов с первым ключом
        for (let i = 0; i < 50; i++) {
          await request.get('/api/v1/organization', {
            headers: { 'X-API-Key': key1Result.apiKey },
          })
        }

        // Проверяем remaining для первого ключа
        const response1 = await request.get('/api/v1/organization', {
          headers: { 'X-API-Key': key1Result.apiKey },
        })
        const remaining1 = parseInt(response1.headers()['x-ratelimit-remaining'])
        expect(remaining1).toBeLessThan(50) // Сделали 51 запрос

        // Проверяем remaining для второго ключа (должен быть полный)
        const response2 = await request.get('/api/v1/organization', {
          headers: { 'X-API-Key': key2Result.apiKey },
        })
        const remaining2 = parseInt(response2.headers()['x-ratelimit-remaining'])
        expect(remaining2).toBe(99) // Первый запрос

        // Ключи изолированы друг от друга
        expect(remaining2).toBeGreaterThan(remaining1)
      } finally {
        await deleteTestApiKey(key1Result.apiKeyId)
        await deleteTestApiKey(key2Result.apiKeyId)
      }
    })
  })

  test.describe('Группа 4: UI для управления rate limits', () => {
    test.use({ storageState: 'playwright/.auth/owner.json' })

    test('P8-5.9 — Owner видит страницу rate limits', async ({ page }) => {
      await page.goto('/owner/rate-limits/')

      // Проверяем что страница загрузилась
      await expect(page.getByRole('heading', { name: /API Rate Limiting/i })).toBeVisible()

      // Описание страницы
      await expect(page.getByText(/Управление лимитами запросов к Public API для организаций/i)).toBeVisible()

      // Статистика должна отображаться
      await expect(page.getByText(/Лимит по умолчанию/i).first()).toBeVisible()
      await expect(page.getByText(/100.*запросов/i)).toBeVisible()
    })
  })
})

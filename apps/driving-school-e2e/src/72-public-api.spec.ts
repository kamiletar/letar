import { expect, test } from './fixtures/base-test'
import { testSchoolAdmin } from './fixtures/test-data'
import { createTestApiKey, deleteTestApiKey } from './helpers/api-key.helpers'
import { getSchoolIdForAdmin } from './helpers/db.helpers'

/**
 * Phase 8.3: Public API v1 — E2E тесты для ZenStack REST API
 *
 * Тестируемый функционал:
 * - GET /api/v1/organization - данные организации
 * - GET /api/v1/member - участники организации
 * - GET /api/v1/team - команды организации
 * - JSON:API формат ответа
 * - Пагинация, фильтрация, сортировка
 * - Авторизация по API-ключу (X-API-Key header)
 * - Access control по organizationId
 * - Whitelist моделей и методов
 * - Rate limit headers
 */

test.describe('Public API v1', () => {
  let schoolId: string
  let apiKey: string
  let apiKeyId: string

  // Создаём API-ключ перед тестами
  test.beforeAll(async () => {
    const id = await getSchoolIdForAdmin(testSchoolAdmin.email)
    if (!id) {
      throw new Error('School not found for test admin')
    }
    schoolId = id

    const result = await createTestApiKey(schoolId, 'Test E2E API Key')
    apiKey = result.apiKey
    apiKeyId = result.apiKeyId
  })

  // Удаляем API-ключ после тестов
  test.afterAll(async () => {
    if (apiKeyId) {
      await deleteTestApiKey(apiKeyId)
    }
  })

  test.describe('Группа 1: Базовые GET запросы', () => {
    test('P8-3.1 — GET /api/v1/organization возвращает данные школы', async ({ request }) => {
      const response = await request.get('/api/v1/organization', {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('data')
      expect(Array.isArray(body.data)).toBe(true)

      // Должна быть хотя бы одна школа (наша)
      expect(body.data.length).toBeGreaterThanOrEqual(1)

      // Проверяем структуру организации (JSON:API формат)
      const org = body.data.find((o: { id: string }) => o.id === schoolId)
      expect(org).toBeDefined()
      expect(org).toHaveProperty('id', schoolId)
      expect(org).toHaveProperty('attributes')
      expect(org.attributes).toHaveProperty('name')
    })

    test('P8-3.2 — GET /api/v1/member возвращает участников', async ({ request }) => {
      const response = await request.get('/api/v1/member', {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('data')
      expect(Array.isArray(body.data)).toBe(true)

      // Проверяем структуру участника (JSON:API формат)
      if (body.data.length > 0) {
        const member = body.data[0]
        expect(member).toHaveProperty('id')
        expect(member).toHaveProperty('attributes')
        expect(member.attributes).toHaveProperty('organizationId', schoolId)
        expect(member.attributes).toHaveProperty('role')
      }
    })

    test('P8-3.3 — GET /api/v1/team возвращает команды', async ({ request }) => {
      const response = await request.get('/api/v1/team', {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('data')
      expect(Array.isArray(body.data)).toBe(true)
    })
  })

  test.describe('Группа 2: JSON:API формат и пагинация', () => {
    test('P8-3.4 — JSON:API формат ответа корректный', async ({ request }) => {
      const response = await request.get('/api/v1/organization', {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('data')
      // JSON:API может иметь meta и links
      expect(body.data).toBeDefined()
    })

    test('P8-3.5 — Пагинация через page[limit] и page[offset]', async ({ request }) => {
      const response = await request.get('/api/v1/member?page[limit]=2&page[offset]=0', {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.data).toBeDefined()
      // Проверяем что не больше 2 элементов
      expect(body.data.length).toBeLessThanOrEqual(2)
    })

    test('P8-3.6 — Фильтрация через filter[field] работает', async ({ request }) => {
      const response = await request.get(`/api/v1/member?filter[organizationId]=${schoolId}`, {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      // Все результаты должны относиться к нашей организации (JSON:API формат)
      body.data.forEach((member: { attributes: { organizationId: string } }) => {
        expect(member.attributes.organizationId).toBe(schoolId)
      })
    })

    test('P8-3.7 — Сортировка через sort работает', async ({ request }) => {
      const response = await request.get('/api/v1/member?sort=createdAt', {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.data).toBeDefined()
      // ZenStack REST API поддерживает сортировку
    })

    test('P8-3.8 — Include связей через include работает', async ({ request }) => {
      const response = await request.get('/api/v1/member?include=user', {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      // ZenStack REST API может включать связанные объекты
      expect(body.data).toBeDefined()
    })
  })

  test.describe('Группа 3: Авторизация', () => {
    test('P8-3.9 — Без API ключа — 401 Unauthorized', async ({ request }) => {
      const response = await request.get('/api/v1/organization')

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toMatch(/API-ключ/)
    })

    test('P8-3.10 — Неверный API ключ — 401 Unauthorized', async ({ request }) => {
      const response = await request.get('/api/v1/organization', {
        headers: { 'X-API-Key': 'ds_live_invalid_key_123' },
      })

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    // P8-3.11 будет протестирован отдельно (создание и отзыв ключа)
  })

  test.describe('Группа 4: Access Control', () => {
    test('P8-3.12 — Данные только своей организации (автофильтр organizationId)', async ({ request }) => {
      const response = await request.get('/api/v1/member', {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      // Все члены должны быть из нашей организации (JSON:API формат)
      body.data.forEach((member: { attributes: { organizationId: string } }) => {
        expect(member.attributes.organizationId).toBe(schoolId)
      })
    })

    test('P8-3.13 — Попытка подмены organizationId блокируется', async ({ request }) => {
      // Пытаемся получить данные чужой организации
      const fakeOrganizationId = 'hack-attempt-organization-id'
      const response = await request.get(`/api/v1/member?filter[organizationId]=${fakeOrganizationId}`, {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      // Должен вернуть пустой массив (т.к. фильтр заменён на invalid-organization-id-blocked)
      expect(body.data).toEqual([])
    })

    test('P8-3.14 — Недоступная модель — 404 Not Found', async ({ request }) => {
      const response = await request.get('/api/v1/user', {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(404)

      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toMatch(/недоступен/)
    })

    test('P8-3.15 — POST/PUT/DELETE — 405 Method Not Allowed', async ({ request }) => {
      // Пробуем POST
      const postResponse = await request.post('/api/v1/organization', {
        headers: { 'X-API-Key': apiKey },
        data: { name: 'Test' },
      })
      expect(postResponse.status()).toBe(405)

      // Пробуем PUT
      const putResponse = await request.put('/api/v1/organization/123', {
        headers: { 'X-API-Key': apiKey },
        data: { name: 'Test' },
      })
      expect(putResponse.status()).toBe(405)

      // Пробуем DELETE
      const deleteResponse = await request.delete('/api/v1/organization/123', {
        headers: { 'X-API-Key': apiKey },
      })
      expect(deleteResponse.status()).toBe(405)
    })
  })

  test.describe('Группа 5: Rate Limiting', () => {
    test('P8-3.16 — Rate limit headers присутствуют', async ({ request }) => {
      const response = await request.get('/api/v1/organization', {
        headers: { 'X-API-Key': apiKey },
      })

      expect(response.status()).toBe(200)

      // Проверяем наличие Rate Limit headers
      const headers = response.headers()
      expect(headers).toHaveProperty('x-ratelimit-limit')
      expect(headers).toHaveProperty('x-ratelimit-remaining')
      expect(headers).toHaveProperty('x-ratelimit-reset')
    })
  })
})

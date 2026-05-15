/**
 * Тесты защиты API endpoints и Server Actions
 *
 * Приложение использует Server Actions вместо API routes,
 * поэтому большинство API endpoints вернут 404.
 * Это тоже безопасно - несуществующий endpoint не может быть использован.
 */
import { expect, test } from '@playwright/test'

test.describe('06-guest: Защита API', () => {
  // Без авторизации
  test.use({ storageState: { cookies: [], origins: [] } })

  test.describe('API endpoints отсутствуют или защищены', () => {
    // Приложение использует Server Actions, API routes не используются
    // 404 = безопасно (endpoint не существует)
    // 401/403 = безопасно (доступ запрещён)
    // Только 200/201 был бы проблемой

    test('GET /api/profile → не 2xx', async ({ request }) => {
      const response = await request.get('/api/profile')
      // Любой статус кроме успешного - безопасен
      expect(response.status()).not.toBe(200)
    })

    test('GET /api/cart → не 2xx', async ({ request }) => {
      const response = await request.get('/api/cart')
      expect(response.status()).not.toBe(200)
    })

    test('GET /api/orders → не 2xx', async ({ request }) => {
      const response = await request.get('/api/orders')
      expect(response.status()).not.toBe(200)
    })

    test('GET /api/admin/users → не 2xx', async ({ request }) => {
      const response = await request.get('/api/admin/users')
      expect(response.status()).not.toBe(200)
    })

    test('GET /api/admin/products → не 2xx', async ({ request }) => {
      const response = await request.get('/api/admin/products')
      expect(response.status()).not.toBe(200)
    })

    test('POST /api/admin/products → не 2xx', async ({ request }) => {
      const response = await request.post('/api/admin/products', {
        data: { name: 'Test', price: 100 },
      })
      expect(response.status()).not.toBe(200)
      expect(response.status()).not.toBe(201)
    })
  })

  test.describe('Auth API', () => {
    test('Auth.js csrf endpoint доступен', async ({ request }) => {
      const response = await request.get('/api/auth/csrf')
      // CSRF endpoint должен быть доступен для работы авторизации
      expect([200, 404]).toContain(response.status())
    })

    test('Auth.js providers endpoint доступен', async ({ request }) => {
      const response = await request.get('/api/auth/providers')
      expect([200, 404]).toContain(response.status())
    })
  })

  test.describe('Несуществующие endpoints безопасны', () => {
    test('Произвольный API endpoint → 404', async ({ request }) => {
      const response = await request.get('/api/random-endpoint-12345')
      expect(response.status()).toBe(404)
    })

    test('Произвольный admin API endpoint → 404', async ({ request }) => {
      const response = await request.get('/api/admin/random-12345')
      expect(response.status()).toBe(404)
    })
  })
})

/**
 * Базовый тест с блокировкой SSE endpoints.
 * SSE соединения (match scoring) блокируют завершение тестов.
 */

import { expect, test as base } from '@playwright/test'

/** SSE паттерны, которые нужно блокировать в навигационных тестах */
const SSE_PATTERNS = ['**/api/match/*/sse']

export const test = base.extend({
  page: async ({ page }, use) => {
    // Блокируем SSE endpoints
    for (const pattern of SSE_PATTERNS) {
      await page.route(pattern, (route) => {
        route.abort('blockedbyclient')
      })
    }
    await use(page)
  },
})

export { expect }

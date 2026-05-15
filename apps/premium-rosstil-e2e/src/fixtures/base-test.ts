import { test as base, expect } from '@playwright/test'

/**
 * SSE endpoints которые нужно блокировать в тестах.
 * EventSource соединения никогда не закрываются и блокируют тесты.
 *
 * Premium-rosstil не использует SSE, но паттерн готов для будущих endpoint-ов.
 */
const SSE_PATTERNS: string[] = []

/**
 * Browser Recycling — счётчик тестов для периодической очистки контекста.
 * Каждые RECYCLE_INTERVAL тестов очищаем permissions для освобождения памяти.
 * ВАЖНО: НЕ очищаем cookies — это сломает авторизацию из storageState!
 */
let testCounter = 0
const RECYCLE_INTERVAL = 25

/**
 * Расширенный test с автоматической блокировкой SSE и Browser Recycling.
 * Используй этот test вместо @playwright/test во всех spec файлах.
 */
export const test = base.extend({
  page: async ({ page, context }, use) => {
    // Browser Recycling: периодически очищаем permissions (НЕ cookies — они нужны для auth)
    testCounter++
    if (testCounter >= RECYCLE_INTERVAL) {
      await context.clearPermissions()
      // Форсируем garbage collection через пустую страницу
      await page.evaluate(() => {
        // @ts-expect-error — gc() доступен только с флагом --expose-gc
        if (typeof gc === 'function') {
          gc()
        }
      })
      testCounter = 0
    }

    // Блокируем SSE endpoints ДО начала теста
    for (const pattern of SSE_PATTERNS) {
      await page.route(pattern, (route) => {
        route.abort('blockedbyclient')
      })
    }

    await use(page)
  },
})

export { expect }

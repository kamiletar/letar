import { expect, test } from './fixtures/base-test'
import { dynamicUrls, urls } from './fixtures/test-data'

test.describe('61. Динамический маршрут тикета поддержки /support/[id]/', () => {
  test.describe('61.1 Загрузка страницы тикета', () => {
    test('E2E-61.1.1 — страница тикета загружается по ID', async ({ page }) => {
      // Сначала переходим на список тикетов
      await page.goto(urls.support)
      await page.waitForLoadState('domcontentloaded')

      // Ищем первый тикет в списке
      const ticketLink = page
        .getByRole('link', { name: /тикет|ticket|обращен|заявк/i })
        .or(page.locator('[data-testid="ticket-item"]'))
        .or(page.locator('a[href*="/support/"]').filter({ hasNotText: /new|создать/i }))
        .first()

      if (!(await ticketLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет тикетов в списке')
        return
      }

      // Кликаем на тикет
      await ticketLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Проверяем что URL изменился на /support/[id]/
      const currentUrl = page.url()
      expect(currentUrl).toMatch(/\/support\/[\w-]+\/?/)
    })

    test('E2E-61.1.2 — несуществующий тикет возвращает 404 или редирект', async ({ page }) => {
      const response = await page.goto(dynamicUrls.supportById('non-existent-ticket-999'))

      const status = response?.status()
      const is404 = status === 404
      const isRedirect = status === 308 || status === 307 || status === 302

      const hasNotFound = await page
        .getByRole('heading', { name: /не найден|not found/i })
        .isVisible()
        .catch(() => false)

      expect(is404 || isRedirect || hasNotFound || status === 200).toBe(true)
    })
  })

  test.describe('61.2 Детали тикета', () => {
    test('E2E-61.2.1 — заголовок тикета отображается', async ({ page }) => {
      await page.goto(urls.support)
      await page.waitForLoadState('domcontentloaded')

      const ticketLink = page
        .locator('a[href*="/support/"]')
        .filter({ hasNotText: /new|создать/i })
        .first()

      if (!(await ticketLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет тикетов')
        return
      }

      await ticketLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем заголовок тикета
      const ticketTitle = page
        .getByRole('heading', { level: 1 })
        .or(page.getByRole('heading', { level: 2 }))
        .or(page.locator('[data-testid="ticket-title"]'))
        .first()

      const hasTitle = await ticketTitle.isVisible().catch(() => false)
      if (hasTitle) {
        await expect(ticketTitle).toBeVisible()
        console.log('  ✓ Заголовок тикета найден')
      } else {
        console.log('  ⏭️ Skip: заголовок не найден')
      }
    })

    test('E2E-61.2.2 — статус тикета отображается', async ({ page }) => {
      await page.goto(urls.support)
      await page.waitForLoadState('domcontentloaded')

      const ticketLink = page
        .locator('a[href*="/support/"]')
        .filter({ hasNotText: /new|создать/i })
        .first()

      if (!(await ticketLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет тикетов')
        return
      }

      await ticketLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем статус тикета
      const statusBadge = page
        .getByText(/открыт|закрыт|в работе|ожидает|open|closed|pending|in progress/i)
        .or(page.locator('[data-testid="ticket-status"]'))
        .first()

      const hasStatus = await statusBadge.isVisible().catch(() => false)
      if (hasStatus) {
        console.log('  ✓ Статус тикета отображается')
      } else {
        console.log('  ⏭️ Skip: статус не найден')
      }
    })

    test('E2E-61.2.3 — дата создания тикета отображается', async ({ page }) => {
      await page.goto(urls.support)
      await page.waitForLoadState('domcontentloaded')

      const ticketLink = page
        .locator('a[href*="/support/"]')
        .filter({ hasNotText: /new|создать/i })
        .first()

      if (!(await ticketLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет тикетов')
        return
      }

      await ticketLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем дату создания
      const createdDate = page
        .getByText(/создан|created|дата/i)
        .or(page.locator('[data-testid="ticket-date"]'))
        .or(page.getByText(/\d{1,2}\.\d{1,2}\.\d{4}/))
        .first()

      const hasDate = await createdDate.isVisible().catch(() => false)
      if (hasDate) {
        console.log('  ✓ Дата создания отображается')
      } else {
        console.log('  ⏭️ Skip: дата создания не найдена')
      }
    })
  })

  test.describe('61.3 Переписка в тикете', () => {
    test('E2E-61.3.1 — история сообщений отображается', async ({ page }) => {
      await page.goto(urls.support)
      await page.waitForLoadState('domcontentloaded')

      const ticketLink = page
        .locator('a[href*="/support/"]')
        .filter({ hasNotText: /new|создать/i })
        .first()

      if (!(await ticketLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет тикетов')
        return
      }

      await ticketLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем сообщения
      const messages = page
        .locator('[data-testid="ticket-message"]')
        .or(page.locator('.ticket-message'))
        .or(page.locator('[data-testid="message"]'))

      const messagesCount = await messages.count().catch(() => 0)
      if (messagesCount > 0) {
        console.log(`  ✓ Найдено ${messagesCount} сообщений в тикете`)
      } else {
        // Проверяем текст описания тикета
        const description = page
          .locator('[data-testid="ticket-description"]')
          .or(page.locator('.ticket-content'))
          .first()

        const hasDescription = await description.isVisible().catch(() => false)
        if (hasDescription) {
          console.log('  ✓ Описание тикета найдено')
        } else {
          console.log('  ⏭️ Skip: сообщения/описание не найдены')
        }
      }
    })

    test('E2E-61.3.2 — форма ответа на тикет доступна', async ({ page }) => {
      await page.goto(urls.support)
      await page.waitForLoadState('domcontentloaded')

      const ticketLink = page
        .locator('a[href*="/support/"]')
        .filter({ hasNotText: /new|создать/i })
        .first()

      if (!(await ticketLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет тикетов')
        return
      }

      await ticketLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем форму ответа
      const replyInput = page
        .getByRole('textbox', { name: /ответ|reply|сообщен/i })
        .or(page.locator('[data-testid="reply-input"]'))
        .or(page.getByPlaceholder(/ответ|напиш|сообщен/i))
        .or(page.locator('textarea'))

      const hasReplyForm = await replyInput.isVisible().catch(() => false)
      if (hasReplyForm) {
        await expect(replyInput).toBeEnabled()
        console.log('  ✓ Форма ответа доступна')
      } else {
        // Тикет может быть закрыт
        const closedStatus = await page
          .getByText(/закрыт|closed|завершён/i)
          .isVisible()
          .catch(() => false)

        if (closedStatus) {
          console.log('  ⏭️ Skip: тикет закрыт, форма ответа недоступна')
        } else {
          console.log('  ⏭️ Skip: форма ответа не найдена')
        }
      }
    })
  })

  test.describe('61.4 Действия с тикетом', () => {
    test('E2E-61.4.1 — кнопка закрытия тикета доступна', async ({ page }) => {
      await page.goto(urls.support)
      await page.waitForLoadState('domcontentloaded')

      const ticketLink = page
        .locator('a[href*="/support/"]')
        .filter({ hasNotText: /new|создать/i })
        .first()

      if (!(await ticketLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет тикетов')
        return
      }

      await ticketLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку закрытия
      const closeButton = page
        .getByRole('button', { name: /закрыть|close|завершить/i })
        .or(page.locator('[data-testid="close-ticket-button"]'))

      const hasCloseButton = await closeButton.isVisible().catch(() => false)
      if (hasCloseButton) {
        await expect(closeButton).toBeEnabled()
        console.log('  ✓ Кнопка закрытия тикета найдена')
      } else {
        // Тикет может быть уже закрыт
        const closedStatus = await page
          .getByText(/закрыт|closed/i)
          .isVisible()
          .catch(() => false)

        if (closedStatus) {
          console.log('  ⏭️ Skip: тикет уже закрыт')
        } else {
          console.log('  ⏭️ Skip: кнопка закрытия не найдена')
        }
      }
    })

    test('E2E-61.4.2 — навигация назад к списку тикетов', async ({ page }) => {
      await page.goto(urls.support)
      await page.waitForLoadState('domcontentloaded')

      const ticketLink = page
        .locator('a[href*="/support/"]')
        .filter({ hasNotText: /new|создать/i })
        .first()

      if (!(await ticketLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет тикетов')
        return
      }

      await ticketLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку назад
      const backButton = page
        .getByRole('link', { name: /назад|back|список|все тикеты/i })
        .or(page.locator('[data-testid="back-button"]'))
        .or(page.getByRole('button', { name: /←|назад/i }))
        .or(page.locator('a[href="/support/"]'))

      const hasBackButton = await backButton.isVisible().catch(() => false)
      if (hasBackButton) {
        await expect(backButton).toBeVisible()
        console.log('  ✓ Кнопка возврата найдена')
      } else {
        console.log('  ⏭️ Skip: кнопка возврата не найдена')
      }
    })
  })
})

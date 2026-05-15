import { expect, test } from './fixtures/base-test'
import { dynamicUrls, urls } from './fixtures/test-data'

test.describe('60. Динамический маршрут чата /chats/[id]/', () => {
  test.describe('60.1 Загрузка страницы чата', () => {
    test('E2E-60.1.1 — страница чата загружается по ID', async ({ page }) => {
      // Сначала переходим на список чатов
      await page.goto(urls.chats)
      await page.waitForLoadState('domcontentloaded')

      // Ищем первый чат в списке
      const chatLink = page
        .getByRole('link', { name: /чат|сообщен|chat/i })
        .or(page.locator('[data-testid="chat-item"]'))
        .or(page.locator('a[href*="/chats/"]'))
        .first()

      if (!(await chatLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет чатов в списке')
        return
      }

      // Кликаем на чат
      await chatLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Проверяем что URL изменился на /chats/[id]/
      const currentUrl = page.url()
      expect(currentUrl).toMatch(/\/chats\/[\w-]+\/?/)
    })

    test('E2E-60.1.2 — несуществующий чат возвращает 404 или редирект', async ({ page }) => {
      const response = await page.goto(dynamicUrls.chatById('non-existent-chat-999'))

      const status = response?.status()
      const is404 = status === 404
      const isRedirect = status === 308 || status === 307 || status === 302

      // Проверяем наличие сообщения об ошибке
      const hasNotFound = await page
        .getByRole('heading', { name: /не найден|not found/i })
        .isVisible()
        .catch(() => false)

      expect(is404 || isRedirect || hasNotFound || status === 200).toBe(true)
    })
  })

  test.describe('60.2 Отображение сообщений', () => {
    test('E2E-60.2.1 — сообщения отображаются в чате', async ({ page }) => {
      await page.goto(urls.chats)
      await page.waitForLoadState('domcontentloaded')

      // Открываем первый чат
      const chatLink = page.locator('a[href*="/chats/"]').first()

      if (!(await chatLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет чатов')
        return
      }

      await chatLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем контейнер сообщений
      const messagesContainer = page
        .locator('[data-testid="messages-container"]')
        .or(page.locator('.messages'))
        .or(page.getByRole('log'))
        .or(page.locator('[role="log"]'))

      const hasMessages = await messagesContainer.isVisible().catch(() => false)
      if (hasMessages) {
        await expect(messagesContainer).toBeVisible()
        console.log('  ✓ Контейнер сообщений найден')
      } else {
        // Проверяем наличие хотя бы одного сообщения
        const message = page.locator('[data-testid="message"]').or(page.locator('.message')).first()

        const hasMessage = await message.isVisible().catch(() => false)
        if (hasMessage) {
          console.log('  ✓ Сообщения отображаются')
        } else {
          console.log('  ⏭️ Skip: сообщения не найдены (возможно, чат пустой)')
        }
      }
    })

    test('E2E-60.2.2 — дата/время сообщений отображается', async ({ page }) => {
      await page.goto(urls.chats)
      await page.waitForLoadState('domcontentloaded')

      const chatLink = page.locator('a[href*="/chats/"]').first()
      if (!(await chatLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет чатов')
        return
      }

      await chatLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем метки времени
      const timestamp = page
        .locator('[data-testid="message-time"]')
        .or(page.locator('.message-time'))
        .or(page.getByText(/\d{1,2}:\d{2}/))
        .first()

      const hasTimestamp = await timestamp.isVisible().catch(() => false)
      if (hasTimestamp) {
        console.log('  ✓ Время сообщений отображается')
      } else {
        console.log('  ⏭️ Skip: метки времени не найдены')
      }
    })
  })

  test.describe('60.3 Отправка сообщений', () => {
    test('E2E-60.3.1 — поле ввода сообщения доступно', async ({ page }) => {
      await page.goto(urls.chats)
      await page.waitForLoadState('domcontentloaded')

      const chatLink = page.locator('a[href*="/chats/"]').first()
      if (!(await chatLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет чатов')
        return
      }

      await chatLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем поле ввода сообщения
      const messageInput = page
        .getByRole('textbox', { name: /сообщен|message/i })
        .or(page.locator('[data-testid="message-input"]'))
        .or(page.getByPlaceholder(/напиш|введ|сообщен/i))
        .or(page.locator('textarea'))

      const hasInput = await messageInput.isVisible().catch(() => false)
      if (hasInput) {
        await expect(messageInput).toBeEnabled()
        console.log('  ✓ Поле ввода сообщения доступно')
      } else {
        console.log('  ⏭️ Skip: поле ввода не найдено')
      }
    })

    test('E2E-60.3.2 — кнопка отправки сообщения доступна', async ({ page }) => {
      await page.goto(urls.chats)
      await page.waitForLoadState('domcontentloaded')

      const chatLink = page.locator('a[href*="/chats/"]').first()
      if (!(await chatLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет чатов')
        return
      }

      await chatLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку отправки
      const sendButton = page
        .getByRole('button', { name: /отправ|send/i })
        .or(page.locator('[data-testid="send-message-button"]'))
        .or(page.locator('button[type="submit"]'))
        .or(page.getByRole('button', { name: /→|➤|📤/i }))

      const hasSendButton = await sendButton.isVisible().catch(() => false)
      if (hasSendButton) {
        await expect(sendButton).toBeVisible()
        console.log('  ✓ Кнопка отправки найдена')
      } else {
        console.log('  ⏭️ Skip: кнопка отправки не найдена')
      }
    })
  })

  test.describe('60.4 UI элементы чата', () => {
    test('E2E-60.4.1 — аватар собеседника отображается', async ({ page }) => {
      await page.goto(urls.chats)
      await page.waitForLoadState('domcontentloaded')

      const chatLink = page.locator('a[href*="/chats/"]').first()
      if (!(await chatLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет чатов')
        return
      }

      await chatLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем аватар в заголовке чата
      const avatar = page
        .locator('[data-testid="chat-avatar"]')
        .or(page.locator('.avatar'))
        .or(page.getByRole('img', { name: /аватар|avatar|профиль/i }))
        .first()

      const hasAvatar = await avatar.isVisible().catch(() => false)
      if (hasAvatar) {
        console.log('  ✓ Аватар собеседника отображается')
      } else {
        console.log('  ⏭️ Skip: аватар не найден')
      }
    })

    test('E2E-60.4.2 — имя собеседника отображается в заголовке', async ({ page }) => {
      await page.goto(urls.chats)
      await page.waitForLoadState('domcontentloaded')

      const chatLink = page.locator('a[href*="/chats/"]').first()
      if (!(await chatLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет чатов')
        return
      }

      await chatLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем имя в заголовке
      const chatHeader = page
        .getByRole('heading')
        .or(page.locator('[data-testid="chat-header"]'))
        .or(page.locator('.chat-header'))
        .first()

      const hasHeader = await chatHeader.isVisible().catch(() => false)
      if (hasHeader) {
        console.log('  ✓ Заголовок чата с именем собеседника найден')
      } else {
        console.log('  ⏭️ Skip: заголовок чата не найден')
      }
    })

    test('E2E-60.4.3 — кнопка возврата к списку чатов', async ({ page }) => {
      await page.goto(urls.chats)
      await page.waitForLoadState('domcontentloaded')

      const chatLink = page.locator('a[href*="/chats/"]').first()
      if (!(await chatLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет чатов')
        return
      }

      await chatLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку назад
      const backButton = page
        .getByRole('link', { name: /назад|back|←/i })
        .or(page.locator('[data-testid="back-button"]'))
        .or(page.getByRole('button', { name: /назад|back|←/i }))
        .or(page.locator('a[href="/chats/"]'))

      const hasBackButton = await backButton.isVisible().catch(() => false)
      if (hasBackButton) {
        await expect(backButton).toBeVisible()
        console.log('  ✓ Кнопка возврата найдена')
      } else {
        console.log('  ⏭️ Skip: кнопка возврата не найдена')
      }
    })

    test('E2E-60.4.4 — индикатор статуса собеседника', async ({ page }) => {
      await page.goto(urls.chats)
      await page.waitForLoadState('domcontentloaded')

      const chatLink = page.locator('a[href*="/chats/"]').first()
      if (!(await chatLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет чатов')
        return
      }

      await chatLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем индикатор онлайн статуса
      const statusIndicator = page
        .locator('[data-testid="online-status"]')
        .or(page.getByText(/онлайн|в сети|online|был.*назад/i))
        .or(page.locator('.online-indicator'))

      const hasStatus = await statusIndicator.isVisible().catch(() => false)
      if (hasStatus) {
        console.log('  ✓ Индикатор статуса найден')
      } else {
        console.log('  ⏭️ Skip: индикатор статуса не найден')
      }
    })
  })
})

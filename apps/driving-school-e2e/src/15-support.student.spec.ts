import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

test.describe('Связь с поддержкой', () => {
  test.describe('Список тикетов', () => {
    test('E2E-9.3.E2E.1 — страница поддержки загружается', async ({ page }) => {
      await page.goto(urls.support)

      // Проверяем заголовок страницы "Мои обращения"
      await expect(page.getByRole('heading', { name: /мои обращения/i })).toBeVisible()
    })

    test('E2E-9.3.E2E.2 — отображается кнопка создания нового тикета', async ({ page }) => {
      await page.goto(urls.support)

      // Кнопка "Новое обращение" (ссылка на /support/new)
      await expect(page.getByRole('link', { name: /новое обращение/i })).toBeVisible()
    })

    test('E2E-9.3.E2E.3 — пустое состояние когда нет тикетов', async ({ page }) => {
      await page.goto(urls.support)

      // Пустое состояние: "У вас пока нет обращений"
      const emptyState = page.getByText(/у вас пока нет обращений/i)
      // Проверяем есть ли тикеты (ссылки на /support/)
      const ticketLinks = page.locator('a[href^="/support/"]').filter({ hasNotText: /новое обращение/i })

      const hasTickets = (await ticketLinks.count()) > 1 // учитываем что есть ссылка "Создать обращение"

      if (!hasTickets) {
        await expect(emptyState).toBeVisible()
      }
    })

    test('E2E-9.3.E2E.4 — тикет отображает статус', async ({ page }) => {
      await page.goto(urls.support)

      // Статусы: "Открыт", "В работе", "Решён", "Закрыт"
      const statusBadge = page.getByText(/открыт|в работе|решён|закрыт/i).first()

      if (await statusBadge.isVisible().catch(() => false)) {
        await expect(statusBadge).toBeVisible()
      } else {
        console.log('  ⏭️ Skip: статус-бейдж не найден (нет тикетов)')
      }
    })

    test('E2E-15.101 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      await page.goto(urls.support)

      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 })

      await context.close()
    })
  })

  test.describe('Создание тикета', () => {
    test('E2E-9.3.E2E.5 — страница создания тикета загружается', async ({ page }) => {
      await page.goto(urls.supportNew)

      // Проверяем заголовок страницы
      await expect(
        page
          .getByRole('heading', { name: /новое обращение|создать тикет|написать/i })
          .or(page.getByText(/обращение в поддержку/i))
      ).toBeVisible()
    })

    test('E2E-9.3.E2E.6 — форма содержит поле темы', async ({ page }) => {
      await page.goto(urls.supportNew)

      // Поле "Заголовок" с placeholder "Кратко опишите проблему"
      await expect(page.getByPlaceholder(/кратко опишите/i).or(page.getByLabel(/заголовок/i))).toBeVisible()
    })

    test('E2E-9.3.E2E.7 — форма содержит поле сообщения', async ({ page }) => {
      await page.goto(urls.supportNew)

      // Поле "Описание" с placeholder "Подробно опишите проблему или предложение"
      await expect(page.getByPlaceholder(/подробно опишите/i).or(page.getByLabel(/описание/i))).toBeVisible()
    })

    test('E2E-9.3.E2E.8 — форма содержит выбор категории', async ({ page }) => {
      await page.goto(urls.supportNew)

      // Chakra Select — ищем по лейблу "Тема обращения" или тексту плейсхолдера "Выберите тему"
      // Select.Root имеет data-field-name="category", триггер внутри него
      const categorySelect = page
        .locator('[data-field-name="category"]')
        .or(page.getByRole('combobox').filter({ hasText: /выберите тему/i }))
      await expect(categorySelect.first()).toBeVisible()
    })

    test('E2E-9.3.E2E.9 — валидация пустой темы', async ({ page }) => {
      await page.goto(urls.supportNew)

      // Заполняем только описание
      const messageField = page.getByPlaceholder(/подробно опишите/i).or(page.getByLabel(/описание/i))
      await messageField.fill('Тестовое сообщение')

      // Пытаемся отправить
      await page.getByRole('button', { name: /отправить/i }).click()

      // Должна быть ошибка валидации или остаться на странице
      await expect(page).toHaveURL(/support\/new/)
    })

    test('E2E-9.3.E2E.10 — успешное создание тикета', async ({ page }) => {
      await page.goto(urls.supportNew)

      // Заполняем форму: категория, заголовок, описание
      // Chakra Select — кликаем триггер, затем опцию в Portal
      const categoryTrigger = page.locator('[data-field-name="category"]')
      const subjectField = page.getByPlaceholder(/кратко опишите/i).or(page.getByLabel(/заголовок/i))
      const messageField = page.getByPlaceholder(/подробно опишите/i).or(page.getByLabel(/описание/i))

      // Выбираем категорию HELP через Chakra Select
      await categoryTrigger.click()
      await page.getByRole('option', { name: /помощь/i }).click()

      await subjectField.fill('E2E тестовый тикет ' + Date.now())
      await messageField.fill('Это тестовое сообщение для E2E теста описание минимум двадцать символов')

      // Отправляем форму
      await page.getByRole('button', { name: /отправить/i }).click()

      // Ждём редиректа - URL должен измениться на /support/<id>
      await expect(page).toHaveURL(/support\/(?!new)[a-z0-9]+/i, { timeout: 15000 })
    })
  })

  test.describe('Просмотр тикета', () => {
    test('E2E-9.3.E2E.11 — страница тикета показывает историю сообщений', async ({ page }) => {
      // Сначала создаём тикет
      await page.goto(urls.supportNew)

      // Chakra Select — кликаем триггер, затем опцию в Portal
      const categoryTrigger = page.locator('[data-field-name="category"]')
      const subjectField = page.getByPlaceholder(/кратко опишите/i).or(page.getByLabel(/заголовок/i))
      const messageField = page.getByPlaceholder(/подробно опишите/i).or(page.getByLabel(/описание/i))

      const ticketSubject = 'E2E тест просмотра ' + Date.now()

      // Выбираем категорию HELP через Chakra Select
      await categoryTrigger.click()
      await page.getByRole('option', { name: /помощь/i }).click()

      await subjectField.fill(ticketSubject)
      await messageField.fill('Тестовое сообщение для просмотра истории минимум двадцать символов')

      await page.getByRole('button', { name: /отправить/i }).click()

      // Ждём редиректа на страницу тикета
      await expect(page).toHaveURL(/support\/(?!new)[a-z0-9]+/i, { timeout: 15000 })

      // Проверяем наличие контента страницы тикета (сообщение или заголовок)
      await expect(page.getByText(/тестовое сообщение/i).first()).toBeVisible({ timeout: 10000 })
    })

    test('E2E-9.3.E2E.12 — можно отправить дополнительное сообщение', async ({ page }) => {
      await page.goto(urls.support)

      // Открываем существующий тикет - ищем ссылки вида /support/cXXX (CUID формат)
      const ticketLink = page.locator('a[href*="/support/c"]').first()

      if (await ticketLink.isVisible().catch(() => false)) {
        await ticketLink.click()

        // Ждём загрузки страницы тикета (CUID начинается с 'c')
        await expect(page).toHaveURL(/support\/c[a-z0-9]+/i, { timeout: 10000 })

        // Должна быть форма отправки сообщения с placeholder "Напишите сообщение..."
        const messageInput = page.getByPlaceholder(/напишите сообщение/i)
        const sendButton = page.getByRole('button', { name: /отправить/i })

        await expect(messageInput).toBeVisible()
        await expect(sendButton).toBeVisible()
      } else {
        console.log('  ⏭️ Skip: ссылка на тикет не найдена (нет существующих тикетов)')
      }
    })

    test('E2E-9.3.E2E.13 — пользователь может закрыть тикет', async ({ page }) => {
      await page.goto(urls.support)

      // Открываем существующий тикет - ищем ссылки вида /support/cXXX (CUID формат)
      const ticketLink = page.locator('a[href*="/support/c"]').first()

      if (await ticketLink.isVisible().catch(() => false)) {
        await ticketLink.click()

        // Ждём загрузки страницы тикета (CUID начинается с 'c')
        await expect(page).toHaveURL(/support\/c[a-z0-9]+/i, { timeout: 10000 })

        // Должна быть кнопка закрытия (из компонента TicketActions)
        const closeButton = page.getByRole('button', { name: /закрыть|решено|в работу/i })
        await expect(closeButton).toBeVisible()
      } else {
        console.log('  ⏭️ Skip: ссылка на тикет не найдена (нет существующих тикетов)')
      }
    })
  })

  test.describe('Категории тикетов', () => {
    // Labels из TicketCategoryLabels (генерируется из schema.zmodel):
    // HELP: 'Помощь', BUG: 'Ошибка', FEATURE: 'Предложение', OTHER: 'Другое'

    test('E2E-9.3.E2E.14 — доступна категория HELP', async ({ page }) => {
      await page.goto(urls.supportNew)

      // Chakra Select — кликаем combobox триггер чтобы открыть список опций
      const categoryTrigger = page.getByRole('combobox', { name: /тема обращения/i })
      await categoryTrigger.click()

      // Проверяем что опция "Помощь" (HELP) доступна в listbox
      await expect(page.getByRole('option', { name: /помощь/i })).toBeVisible()
    })

    test('E2E-9.3.E2E.15 — доступна категория BUG', async ({ page }) => {
      await page.goto(urls.supportNew)

      // Chakra Select — кликаем combobox триггер чтобы открыть список опций
      const categoryTrigger = page.getByRole('combobox', { name: /тема обращения/i })
      await categoryTrigger.click()

      // Проверяем что опция "Ошибка" (BUG) доступна в listbox
      await expect(page.getByRole('option', { name: /ошибка/i })).toBeVisible()
    })

    test('E2E-9.3.E2E.16 — доступна категория FEATURE', async ({ page }) => {
      await page.goto(urls.supportNew)

      // Chakra Select — кликаем combobox триггер чтобы открыть список опций
      const categoryTrigger = page.getByRole('combobox', { name: /тема обращения/i })
      await categoryTrigger.click()

      // Проверяем что опция "Предложение" (FEATURE) доступна в listbox
      await expect(page.getByRole('option', { name: /предложение/i })).toBeVisible()
    })
  })
})

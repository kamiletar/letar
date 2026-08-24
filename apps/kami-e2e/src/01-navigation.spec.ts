import { expect, test } from '@playwright/test'

test.describe('Навигация и главная страница', () => {
  test.describe('Главная страница', () => {
    test('1.1 — главная страница загружается корректно', async ({ page }) => {
      await page.goto('/')

      // Проверяем Hero секцию
      await expect(page.getByRole('heading', { name: /Ками/i })).toBeVisible()
      await expect(page.getByText(/Привет, я/i)).toBeVisible()
      await expect(page.getByText(/Архитектор/i)).toBeVisible()
    })

    test('1.2 — отображаются CTA кнопки', async ({ page }) => {
      await page.goto('/')

      // Проверяем кнопки призыва к действию
      await expect(page.getByRole('link', { name: /Познакомиться/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Позвать на работу/i })).toBeVisible()
    })

    test('1.3 — CTA кнопка "Познакомиться" ведёт на страницу About', async ({ page }) => {
      await page.goto('/')

      await page.getByRole('link', { name: /Познакомиться/i }).click()

      await expect(page).toHaveURL(/\/about\//)
    })

    test('1.4 — CTA кнопка "Позвать на работу" ведёт на страницу Hire', async ({ page }) => {
      await page.goto('/')

      await page.getByRole('link', { name: /Позвать на работу/i }).click()

      await expect(page).toHaveURL(/\/hire\//)
    })
  })

  test.describe('Header', () => {
    test('2.1 — header отображается на главной', async ({ page }) => {
      await page.goto('/')

      // Accessible name ссылки — явный aria-label="Главная страница" (перебивает текст "Kami"
      // внутри); ссылка также дублируется в мобильном и десктопном Flex-блоках, нужен видимый
      // экземпляр
      await expect(
        page.getByRole('link', { name: /Главная страница/i }).and(page.locator(':visible')),
      ).toBeVisible()
    })

    test('2.2 — навигация в header работает (desktop)', async ({ page }) => {
      await page.goto('/')

      // Ссылки навигации дублируются в footer — скоупим к header, иначе strict-mode violation
      const headerNav = page.getByRole('navigation', { name: /Основная навигация/i })
      await expect(headerNav.getByRole('link', { name: /Обо мне/i })).toBeVisible()
      await expect(headerNav.getByRole('link', { name: /Навыки/i })).toBeVisible()
      await expect(headerNav.getByRole('link', { name: /Проекты/i })).toBeVisible()
      await expect(headerNav.getByRole('link', { name: /Блог/i })).toBeVisible()
    })

    test('2.3 — клик по навигации ведёт на правильную страницу', async ({ page }) => {
      await page.goto('/')

      const headerNav = page.getByRole('navigation', { name: /Основная навигация/i })
      await headerNav.getByRole('link', { name: /Обо мне/i }).click()

      await expect(page).toHaveURL(/\/about\//)
    })
  })

  test.describe('Footer', () => {
    test('3.1 — footer отображается', async ({ page }) => {
      await page.goto('/')

      // Скроллим вниз для уверенности
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

      // Проверяем copyright
      await expect(page.getByText(/Все права защищены/i)).toBeVisible()
    })
  })
})

test.describe('Переключатель языка', () => {
  test('4.1 — переключение на английский язык', async ({ page }) => {
    await page.goto('/')

    // Открываем меню языков
    await page.getByRole('button', { name: /Русский|RU/i }).click()

    // Выбираем английский
    await page.getByRole('menuitem', { name: /English/i }).click()

    // Проверяем, что URL содержит /en/
    await expect(page).toHaveURL(/\/en\//)

    // Проверяем, что текст изменился на английский
    await expect(page.getByText(/Hello, I'm/i)).toBeVisible()
  })

  test('4.2 — переключение обратно на русский', async ({ page }) => {
    await page.goto('/en/')

    // Открываем меню языков
    await page.getByRole('button', { name: /English|EN/i }).click()

    // Выбираем русский
    await page.getByRole('menuitem', { name: /Русский/i }).click()

    // Проверяем, что URL не содержит /en/ (русский - язык по умолчанию)
    await expect(page).not.toHaveURL(/\/en\//)

    // Проверяем, что текст на русском
    await expect(page.getByText(/Привет, я/i)).toBeVisible()
  })
})

test.describe('Переключатель темы', () => {
  test('5.1 — кнопка переключения темы присутствует', async ({ page }) => {
    await page.goto('/')

    // aria-label — "Переключить тему" (винительный падеж, не "тема"); кнопка также дублируется
    // в мобильном и десктопном Flex-блоках, поэтому скоуп на видимый экземпляр
    await expect(page.getByRole('button', { name: /тему|theme/i }).and(page.locator(':visible'))).toBeVisible()
  })
})

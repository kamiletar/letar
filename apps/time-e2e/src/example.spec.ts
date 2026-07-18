import { expect, test } from '@playwright/test'

/**
 * Смок-тест главной страницы. Заменяет дефолтный Nx-плейсхолдер (`<h1>` с "Welcome" — такого
 * элемента в приложении нет вообще, тест всегда таймаутился, см. PLAN.md §18.7, находка
 * BlackCove при первом staging-прогоне). Страница — client component (`'use client'`,
 * apps/time/src/app/[locale]/page.tsx) без хардкод-заголовка, только `<title>` из metadata и
 * текст часа (условный: обычный счётчик либо milestone-вариант при круглом числе часов).
 */
test('главная страница показывает счётчик часов UNIX-эпохи', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Который час?')
  // Оба варианта текста ("Сейчас N-й час..." / "... часов прошло...") содержат "час" —
  // не завязываемся на конкретную ветку, чтобы не флейкать на редком milestone-состоянии.
  await expect(page.getByText(/час/i).first()).toBeVisible()
})

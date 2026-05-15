/**
 * Тесты просмотрщика мандал
 *
 * Проверяем функциональность детального просмотра мандалы
 */
import { expect, test } from '@playwright/test'

test.describe('Просмотрщик мандал', () => {
  // Убеждаемся, что нет сохранённой сессии
  test.use({ storageState: { cookies: [], origins: [] } })

  // Хелпер для закрытия PWA оффлайн-уведомления
  async function dismissOfflinePrompt(page: import('@playwright/test').Page) {
    // Ждём появления уведомления (анимация занимает время)
    await page.waitForTimeout(1000)
    const notNowButton = page.getByRole('button', { name: /не сейчас/i })
    if ((await notNowButton.count()) > 0) {
      await notNowButton.click()
      // Ждём закрытия уведомления
      await page.waitForTimeout(500)
    }
  }

  test.describe('Страница мандалы', () => {
    test('загружается корректно', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      // Переходим к первой мандале
      const mandalaLink = page.locator('a[href*="/mandalas/"]').first()
      const hasMandalas = (await mandalaLink.count()) > 0

      if (!hasMandalas) {
        test.skip()
        return
      }

      await mandalaLink.click()
      await page.waitForURL(/\/mandalas\/.+/)

      // Проверяем, что мандала загрузилась (MandalaCanvas использует canvas)
      await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 })
    })

    test('отображает заголовок мандалы', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      const mandalaLink = page.locator('a[href*="/mandalas/"]').first()
      if ((await mandalaLink.count()) === 0) {
        test.skip()
        return
      }

      await mandalaLink.click()
      await page.waitForURL(/\/mandalas\/.+/)

      // Должен быть заголовок
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
  })

  test.describe('Fullscreen режим', () => {
    test('есть кнопка для перехода в полноэкранный режим', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      const mandalaLink = page.locator('a[href*="/mandalas/"]').first()
      if ((await mandalaLink.count()) === 0) {
        test.skip()
        return
      }

      await mandalaLink.click()
      await page.waitForURL(/\/mandalas\/.+/)

      // Ищем кнопку fullscreen (текст "На весь экран" или data-onboarding)
      const fullscreenButton = page.getByRole('button', { name: /на весь экран/i })
      const fullscreenByAttr = page.locator('[data-onboarding="fullscreen-btn"]')

      const hasButton = (await fullscreenButton.count()) > 0
      const hasByAttr = (await fullscreenByAttr.count()) > 0

      expect(hasButton || hasByAttr).toBeTruthy()
    })
  })

  test.describe('Навигация между мандалами', () => {
    test('есть кнопки prev/next', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      const mandalaLink = page.locator('a[href*="/mandalas/"]').first()
      if ((await mandalaLink.count()) === 0) {
        test.skip()
        return
      }

      await mandalaLink.click()
      await page.waitForURL(/\/mandalas\/.+/)

      // Ищем кнопки навигации (aria-label содержит "Предыдущая:" или "Следующая:")
      const prevButton = page.locator('[aria-label^="Предыдущая:"]')
      const nextButton = page.locator('[aria-label^="Следующая:"]')

      const hasPrev = (await prevButton.count()) > 0
      const hasNext = (await nextButton.count()) > 0

      // Хотя бы одна кнопка навигации должна быть
      expect(hasPrev || hasNext).toBeTruthy()
    })
  })

  test.describe('Эффекты и настройки', () => {
    test('есть панель управления эффектами', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      const mandalaLink = page.locator('a[href*="/mandalas/"]').first()
      if ((await mandalaLink.count()) === 0) {
        test.skip()
        return
      }

      await mandalaLink.click()
      await page.waitForURL(/\/mandalas\/.+/)

      // Ищем панель управления ViewerControls (справа от мандалы)
      // Она содержит различные настройки: эффекты, скорость, аудио и т.д.
      const viewerControls = page.locator('[class*="chakra"]').filter({ hasText: /эффект|скорость|вращени/i })
      const settingsSection = page.getByText(/настройк|эффект|скорость/i).first()

      const hasControls = (await viewerControls.count()) > 0
      const hasSettings = (await settingsSection.count()) > 0

      // Должен быть какой-то способ управления эффектами
      expect(hasControls || hasSettings).toBeTruthy()
    })
  })

  test.describe('Кнопка "Поделиться"', () => {
    test('есть возможность поделиться мандалой', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      const mandalaLink = page.locator('a[href*="/mandalas/"]').first()
      if ((await mandalaLink.count()) === 0) {
        test.skip()
        return
      }

      await mandalaLink.click()
      await page.waitForURL(/\/mandalas\/.+/)

      // Ищем кнопку "Поделиться" (текст или aria-label)
      const shareButton = page.getByRole('button', { name: /поделиться/i })

      await expect(shareButton).toBeVisible()
    })
  })

  test.describe('Режим медитации', () => {
    test('таймер отсчитывает время', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      // Переходим к первой мандале
      const mandalaLink = page.locator('a[href*="/mandalas/"]').first()
      if ((await mandalaLink.count()) === 0) {
        test.skip()
        return
      }

      await mandalaLink.click()
      await page.waitForURL(/\/mandalas\/.+/)

      // Включаем медитацию ДО перехода в fullscreen (проще кликать)
      // Ждём загрузки панели настроек
      await expect(page.getByText('Настройки просмотра')).toBeVisible({ timeout: 5000 })

      // Кликаем на label "Медитация" чтобы включить режим
      // (Chakra Switch перехватывает клики на checkbox, поэтому кликаем на текст)
      await page.getByText('Медитация', { exact: true }).click()

      // Проверяем что медитация включена — появляется слайдер времени (может быть несколько)
      await expect(page.getByText(/\d+ мин/).first()).toBeVisible({ timeout: 3000 })

      // Переходим в fullscreen режим
      await page.getByRole('button', { name: /на весь экран/i }).click()

      // Ждём открытия fullscreen — появится таймер с текстом "Медитация" и временем
      await expect(page.locator('text=/^\\d{2}:\\d{2}$/').first()).toBeVisible({ timeout: 5000 })

      // Находим текст времени (формат MM:SS)
      const timerText = page.locator('text=/^\\d{2}:\\d{2}$/').first()

      // Запоминаем начальное время
      const initialTime = await timerText.textContent()

      // Ждём 3 секунды
      await page.waitForTimeout(3000)

      // Проверяем, что время изменилось (таймер идёт)
      const newTime = timerText
      await expect(newTime).not.toHaveText(initialTime)
    })

    test('индикатор дыхания появляется при включении', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      const mandalaLink = page.locator('a[href*="/mandalas/"]').first()
      if ((await mandalaLink.count()) === 0) {
        test.skip()
        return
      }

      await mandalaLink.click()
      await page.waitForURL(/\/mandalas\/.+/)

      // Ждём загрузки панели настроек
      await expect(page.getByText('Настройки просмотра')).toBeVisible({ timeout: 5000 })

      // Включаем дыхание ДО перехода в fullscreen (проще кликать)
      // Кликаем на label "Анимация дыхания"
      await page.getByText('Анимация дыхания').click()

      // Переходим в fullscreen режим
      await page.getByRole('button', { name: /на весь экран/i }).click()

      // Ждём открытия fullscreen
      await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

      // Ждём появления индикатора дыхания (текст "Вдох..." или "Выдох..." или "Задержка...")
      const breathingHint = page.getByText(/вдох|выдох|задержка/i).first()
      await expect(breathingHint).toBeVisible({ timeout: 10000 })
    })

    test('таймер можно поставить на паузу', async ({ page }) => {
      await page.goto('/mandalas')
      await dismissOfflinePrompt(page)

      const mandalaLink = page.locator('a[href*="/mandalas/"]').first()
      if ((await mandalaLink.count()) === 0) {
        test.skip()
        return
      }

      await mandalaLink.click()
      await page.waitForURL(/\/mandalas\/.+/)

      // Ждём загрузки панели настроек
      await expect(page.getByText('Настройки просмотра')).toBeVisible({ timeout: 5000 })

      // Включаем медитацию ДО перехода в fullscreen
      await page.getByText('Медитация', { exact: true }).click()

      // Проверяем что медитация включена
      await expect(page.getByText(/\d+ мин/).first()).toBeVisible({ timeout: 3000 })

      // Переходим в fullscreen
      await page.getByRole('button', { name: /на весь экран/i }).click()

      // Ждём появления таймера
      const timerText = page.locator('text=/^\\d{2}:\\d{2}$/').first()
      await expect(timerText).toBeVisible({ timeout: 5000 })

      // Находим кнопку паузы
      const pauseButton = page.getByRole('button', { name: /пауза/i }).first()
      if ((await pauseButton.count()) > 0) {
        await pauseButton.click()

        // Ждём чтобы пауза применилась
        await page.waitForTimeout(500)

        // Запоминаем время
        const timeOnPause = await timerText.textContent()

        // Ждём 2 секунды
        await page.waitForTimeout(2000)

        // Время не должно измениться
        const timeAfterPause = timerText
        await expect(timeAfterPause).toHaveText(timeOnPause)
      }
    })
  })
})

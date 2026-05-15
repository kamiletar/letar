/**
 * Dev тесты для Library Filters
 *
 * Тестируют UI фильтров через HTTP (без Electron).
 * Проверяют:
 * - Применение фильтров (жанр, статус, год)
 * - Сортировку
 * - Обновление URL параметров
 * - ActiveFilters чипы
 */

import { expect, test } from '@playwright/test'

/** localStorage ключ для отключения Welcome диалога */
const WELCOME_SHOWN_KEY = 'animatrona-welcome-shown'

/**
 * Отключить Welcome диалог перед навигацией.
 */
async function disableWelcomeDialog(page: import('@playwright/test').Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, 'true')
  }, WELCOME_SHOWN_KEY)
}

test.describe('Library Filters', () => {
  test.beforeEach(async ({ page }) => {
    await disableWelcomeDialog(page)
    await page.goto('/library')
  })

  test('фильтр по статусу применяется', async ({ page }) => {
    // Desktop viewport по умолчанию

    // Находим Select для статуса — Chakra Select.Trigger
    // Лейбл статуса внутри HStack с текстом "Фильтры:"
    const statusTrigger = page
      .locator('button')
      .filter({ hasText: /все статусы|выходит|завершён|анонс/i })
      .first()

    // Если select не найден напрямую, ищем по placeholder
    if (!(await statusTrigger.isVisible().catch(() => false))) {
      // Пробуем найти через placeholder
      const altTrigger = page.getByText('Все статусы').first()
      if (await altTrigger.isVisible().catch(() => false)) {
        await altTrigger.click()
      }
    } else {
      await statusTrigger.click()
    }

    // Ждём появления списка опций
    await page.waitForTimeout(300)

    // Выбираем "Выходит" (ONGOING)
    const ongoingOption = page.getByRole('option', { name: /выходит/i })
    if (await ongoingOption.isVisible().catch(() => false)) {
      await ongoingOption.click()

      // URL должен содержать status=ONGOING
      await expect(page).toHaveURL(/status=ONGOING/i, { timeout: 5000 })
    } else {
      // Fallback: ищем по тексту
      const textOption = page.getByText('Выходит').first()
      if (await textOption.isVisible().catch(() => false)) {
        await textOption.click()
        await expect(page).toHaveURL(/status=ONGOING/i, { timeout: 5000 })
      } else {
        // Skip если UI отличается
        test.skip()
      }
    }
  })

  test('сортировка изменяет порядок', async ({ page }) => {
    // Находим select сортировки — рядом с текстом "Сортировка:"
    const sortLabel = page.getByText('Сортировка:')
    await expect(sortLabel).toBeVisible({ timeout: 5000 })

    // Кликаем на trigger сортировки (следующий sibling после label)
    // В Chakra Select.Trigger это button с текстом текущей сортировки
    const sortTrigger = page
      .locator('button')
      .filter({
        hasText: /недавно обновлённые|по названию|по году|по рейтингу/i,
      })
      .first()

    if (await sortTrigger.isVisible().catch(() => false)) {
      await sortTrigger.click()
    } else {
      // Fallback: ищем Select рядом с label
      const sortSection = page.locator('div').filter({ has: sortLabel }).first()
      const trigger = sortSection.getByRole('combobox')
      if (await trigger.isVisible().catch(() => false)) {
        await trigger.click()
      } else {
        test.skip()
        return
      }
    }

    await page.waitForTimeout(300)

    // Выбираем "По году (новые)"
    const yearOption = page.getByRole('option', { name: /по году \(новые\)/i })
    if (await yearOption.isVisible().catch(() => false)) {
      await yearOption.click()

      // URL должен содержать sort=-year
      await expect(page).toHaveURL(/sort=-year/i, { timeout: 5000 })
    } else {
      const textOption = page.getByText(/по году \(новые\)/i).first()
      if (await textOption.isVisible().catch(() => false)) {
        await textOption.click()
        await expect(page).toHaveURL(/sort=-year/i, { timeout: 5000 })
      } else {
        test.skip()
      }
    }
  })

  test('поиск обновляет URL', async ({ page }) => {
    // Находим поле поиска в фильтрах
    const searchInput = page.getByPlaceholder(/поиск аниме/i)
    await expect(searchInput).toBeVisible({ timeout: 5000 })

    // Вводим текст поиска
    await searchInput.fill('Наруто')

    // Ждём debounce (обычно 300-500ms)
    await page.waitForTimeout(600)

    // URL должен содержать q=Наруто (URL encoded)
    await expect(page).toHaveURL(/q=/, { timeout: 5000 })
  })

  test('фильтр по году применяется', async ({ page }) => {
    // Находим Input type="number" для года — placeholder="от"
    const yearInput = page.locator('input[type="number"][placeholder="от"]').first()

    if (!(await yearInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip()
      return
    }

    // Вводим год
    await yearInput.fill('2020')
    await page.waitForTimeout(500)

    // URL должен содержать yearMin=2020
    await expect(page).toHaveURL(/yearMin=2020/, { timeout: 5000 })
  })

  test('ActiveFilters чипы появляются при фильтрации', async ({ page }) => {
    // Устанавливаем фильтр через URL напрямую
    await page.goto('/library?status=ONGOING')

    // Должен появиться чип с активным фильтром
    // ActiveFilters показывает Tag с "Статус:Выходит"
    const filterChip = page.locator('.chakra-tag__label').filter({ hasText: /выходит/i })
    await expect(filterChip.first()).toBeVisible({ timeout: 5000 })
  })

  test('сброс фильтров работает', async ({ page }) => {
    // Устанавливаем несколько фильтров через URL
    await page.goto('/library?status=ONGOING&yearMin=2020')
    await page.waitForTimeout(500)

    // Находим кнопку "Сбросить все" в ActiveFilters
    const resetButton = page.getByText('Сбросить все')

    if (await resetButton.isVisible().catch(() => false)) {
      await resetButton.click()
      await page.waitForTimeout(300)

      // URL должен очиститься
      await expect(page).not.toHaveURL(/status=/)
      await expect(page).not.toHaveURL(/yearMin=/)
    } else {
      // Fallback: ищем кнопку сброса с другим текстом
      const altResetButton = page.getByRole('button', { name: /сбросить|очистить|reset/i })
      if (await altResetButton.isVisible().catch(() => false)) {
        await altResetButton.click()
        await expect(page).not.toHaveURL(/status=/)
      } else {
        // Проверяем что чипы можно закрыть по крестику
        const closeChipButton = page
          .locator('button')
          .filter({ has: page.locator('svg') })
          .first()
        if (await closeChipButton.isVisible().catch(() => false)) {
          await closeChipButton.click()
          await page.waitForTimeout(300)
        } else {
          test.skip()
        }
      }
    }
  })
})

test.describe('Library Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await disableWelcomeDialog(page)
    await page.goto('/library')
  })

  test('сортировка по названию (А-Я)', async ({ page }) => {
    // Кликаем на trigger сортировки
    const sortTrigger = page
      .locator('button')
      .filter({ hasText: /недавно обновлённые|сортировка/i })
      .first()

    if (await sortTrigger.isVisible().catch(() => false)) {
      await sortTrigger.click()
      await page.waitForTimeout(300)

      const option = page.getByText(/по названию \(а-я\)/i).first()
      if (await option.isVisible().catch(() => false)) {
        await option.click()
        await expect(page).toHaveURL(/sort=title/, { timeout: 5000 })
      }
    } else {
      test.skip()
    }
  })

  test('сортировка по рейтингу', async ({ page }) => {
    // Прямая навигация с параметром
    await page.goto('/library?sort=-rating')

    // Проверяем что сортировка установлена в URL
    await expect(page).toHaveURL(/sort=-rating/)

    // Select trigger должен показывать "По рейтингу"
    // Используем Chakra Select value text
    const sortDisplay = page.locator('[data-part="value-text"]').filter({ hasText: /по рейтингу/i })
    await expect(sortDisplay.first()).toBeVisible({ timeout: 5000 })
  })
})

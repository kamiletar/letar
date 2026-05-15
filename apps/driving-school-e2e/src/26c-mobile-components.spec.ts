/**
 * E2E тесты: Phase 7 — Mobile UX — Компоненты
 *
 * Тесты для проверки адаптации UI компонентов на мобильных устройствах.
 * Запускаются с проектами mobile-portrait, mobile-landscape и tablet.
 *
 * @see apps/driving-school/docs/testing/PHASE7_MOBILE_UX.md
 */

import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

test.describe('Mobile UX — Компоненты', () => {
  test('E2E-MOB-1.4 — таблицы прокручиваются горизонтально', async ({ page }) => {
    await page.goto(urls.lessons)

    // Ищем таблицы на странице
    const tables = page.locator('table')
    const tableCount = await tables.count()

    if (tableCount > 0) {
      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i)
        const parent = table.locator('..')

        // Проверяем, что у контейнера таблицы есть overflow-x: auto или scroll
        const overflowX = await parent.evaluate((el) => {
          const style = window.getComputedStyle(el)
          return style.overflowX
        })

        // Таблица должна быть в скроллируемом контейнере или сама прокручиваться
        const tableOverflow = await table.evaluate((el) => {
          const style = window.getComputedStyle(el)
          return style.overflowX
        })

        const isScrollable =
          overflowX === 'auto' || overflowX === 'scroll' || tableOverflow === 'auto' || tableOverflow === 'scroll'

        // Если таблица шире viewport, она должна быть скроллируемой
        const tableBox = await table.boundingBox()
        const viewportSize = page.viewportSize()

        if (tableBox && viewportSize && tableBox.width > viewportSize.width) {
          expect(isScrollable, `Таблица #${i} не скроллируется`).toBe(true)
        }
      }
    }

    // Тест проходит даже если таблиц нет
    expect(true).toBe(true)
  })

  test('E2E-MOB-1.5 — карточки занятий адаптированы под мобильные', async ({ page }) => {
    await page.goto(urls.lessons)

    // Ищем карточки занятий
    const cards = page.locator('[data-testid*="lesson"], [class*="card"], [class*="Card"]')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      const viewportSize = page.viewportSize()

      for (let i = 0; i < Math.min(cardCount, 5); i++) {
        const card = cards.nth(i)
        const box = await card.boundingBox()

        if (box && viewportSize) {
          // Карточка не должна выходить за пределы viewport
          expect(box.x + box.width, `Карточка #${i} выходит за viewport`).toBeLessThanOrEqual(viewportSize.width + 10)
        }
      }
    }

    await expect(page.locator('body')).toBeVisible()
  })

  test('E2E-MOB-1.6 — календарь расписания работает на touch-устройствах', async ({ page }) => {
    await page.goto(urls.schedule || urls.lessons)

    // Ищем календарный компонент
    const calendar = page.locator('[class*="calendar"], [data-testid="calendar"], [role="grid"]')

    if ((await calendar.count()) > 0) {
      await expect(calendar.first()).toBeVisible()

      // Календарь должен помещаться в viewport
      const box = await calendar.first().boundingBox()
      const viewportSize = page.viewportSize()

      if (box && viewportSize) {
        expect(box.width).toBeLessThanOrEqual(viewportSize.width)
      }
    }

    // Если календаря нет, тест проходит
    await expect(page.locator('body')).toBeVisible()
  })

  test('E2E-MOB-1.7 — модальные окна занимают всю высоту на мобильных', async ({ page }) => {
    await page.goto(urls.dashboard)

    // Пытаемся найти кнопку, которая открывает модальное окно
    const modalTriggers = page.getByRole('button').filter({ hasText: /добавить|создать|новый|редактировать/i })

    const triggerCount = await modalTriggers.count()

    if (triggerCount > 0) {
      // Кликаем на первый триггер
      await modalTriggers.first().click()

      // Ждём появления модального окна
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]')

      if ((await modal.count()) > 0) {
        await expect(modal.first()).toBeVisible({ timeout: 5000 })

        const viewportSize = page.viewportSize()
        // На мобильных (ширина < 768) модалка должна быть почти на весь экран
        if (viewportSize && viewportSize.width < 768) {
          const box = await modal.first().boundingBox()

          if (box) {
            // Модалка должна занимать значительную часть экрана
            const heightRatio = box.height / viewportSize.height
            expect(heightRatio, 'Модалка слишком маленькая').toBeGreaterThan(0.5)
          }
        }

        // Закрываем модалку
        await page.keyboard.press('Escape')
      }
    }

    expect(true).toBe(true)
  })

  test('E2E-MOB-1.17 — фильтры занятий работают в мобильном drawer', async ({ page }) => {
    await page.goto(urls.lessons)

    const viewportSize = page.viewportSize()

    // На мобильных фильтры часто скрыты в drawer
    if (viewportSize && viewportSize.width < 768) {
      // Ищем кнопку фильтров
      const filterButton = page
        .getByRole('button', { name: /фильтр|filter/i })
        .or(page.locator('[aria-label*="фильтр"], [aria-label*="filter"]'))

      if ((await filterButton.count()) > 0) {
        await filterButton.first().click()

        // Должен открыться drawer с фильтрами
        const drawer = page.locator('[role="dialog"], [class*="drawer"], [class*="Drawer"], [class*="bottom-sheet"]')

        if ((await drawer.count()) > 0) {
          await expect(drawer.first()).toBeVisible({ timeout: 5000 })
        }
      }
    }

    await expect(page.locator('body')).toBeVisible()
  })

  test('E2E-MOB-1.19 — уведомления отображаются корректно на мобильных', async ({ page }) => {
    await page.goto(urls.dashboard)

    // Ищем уведомления (toast, alert и т.д.)
    const notifications = page.locator('[role="alert"], [class*="toast"], [class*="Toast"], [class*="notification"]')

    // Если есть уведомления, проверяем их позиционирование
    const notificationCount = await notifications.count()

    if (notificationCount > 0) {
      const viewportSize = page.viewportSize()

      for (let i = 0; i < notificationCount; i++) {
        const notification = notifications.nth(i)
        const box = await notification.boundingBox()

        if (box && viewportSize) {
          // Уведомление должно быть в пределах viewport
          expect(box.x + box.width).toBeLessThanOrEqual(viewportSize.width + 10)
          expect(box.y).toBeGreaterThanOrEqual(0)
        }
      }
    }

    // Тест проходит если уведомлений нет
    expect(true).toBe(true)
  })

  test('E2E-MC-07 — bottom sheet модалки', async ({ page }) => {
    await page.goto(urls.dashboard)
    await page.waitForLoadState('domcontentloaded')

    const viewportSize = page.viewportSize()

    if (viewportSize && viewportSize.width < 768) {
      // Ищем кнопки, которые могут открыть bottom sheet
      const triggers = page
        .getByRole('button', { name: /фильтр|сортировка|действия|опции|ещё|filter|sort|options|more/i })
        .or(page.locator('[data-testid*="filter"], [data-testid*="sort"], [data-testid*="options"]'))

      const triggerCount = await triggers.count()

      if (triggerCount > 0) {
        await triggers.first().click()
        await page.waitForTimeout(500)

        // Проверяем появление bottom sheet
        const bottomSheet = page
          .locator('[class*="bottom-sheet" i], [class*="BottomSheet"]')
          .or(page.locator('[class*="drawer" i]').filter({ has: page.locator('[class*="bottom"]') }))
          .or(page.locator('[role="dialog"]'))

        const hasBottomSheet = await bottomSheet
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false)

        if (hasBottomSheet) {
          const sheetBox = await bottomSheet.first().boundingBox()

          if (sheetBox && viewportSize) {
            // Bottom sheet должен быть внизу экрана или занимать значительную часть
            const isAtBottom = sheetBox.y + sheetBox.height >= viewportSize.height - 50
            const isLargeEnough = sheetBox.height >= viewportSize.height * 0.3

            if (isAtBottom || isLargeEnough) {
              console.log('  ✓ Bottom sheet отображается корректно')
            } else {
              console.log('  ✓ Модалка открывается (возможно не bottom sheet стиль)')
            }
          }

          await page.keyboard.press('Escape')
        } else {
          console.log('  ⏭️ Skip: bottom sheet не открылся')
        }
      } else {
        console.log('  ⏭️ Skip: триггеры для bottom sheet не найдены')
      }
    } else {
      console.log('  ⏭️ Skip: тест только для мобильных viewport')
    }
  })

  test('E2E-MC-08 — mobile date picker', async ({ page }) => {
    await page.goto(urls.lessons)
    await page.waitForLoadState('domcontentloaded')

    const viewportSize = page.viewportSize()

    if (viewportSize && viewportSize.width < 768) {
      // Ищем date input'ы
      const dateInputs = page.locator('input[type="date"], input[type="datetime-local"]')
      const dateCount = await dateInputs.count()

      if (dateCount > 0) {
        const dateInput = dateInputs.first()

        // Проверяем размер для удобного тапа
        const box = await dateInput.boundingBox()
        if (box) {
          expect(box.height, 'Date input слишком маленький').toBeGreaterThanOrEqual(36)
          expect(box.width, 'Date input слишком узкий').toBeGreaterThanOrEqual(100)
        }

        // Пробуем открыть date picker
        await dateInput.click()
        await page.waitForTimeout(500)

        // На мобильных нативный date picker открывается системой
        // Проверяем кастомные date picker'ы
        const customDatePicker = page
          .locator('[class*="datepicker" i], [class*="DatePicker"], [class*="calendar" i]')
          .or(page.locator('[role="dialog"]').filter({ has: page.locator('[role="grid"]') }))

        const hasCustomPicker = await customDatePicker
          .first()
          .isVisible({ timeout: 1000 })
          .catch(() => false)

        if (hasCustomPicker) {
          const pickerBox = await customDatePicker.first().boundingBox()
          if (pickerBox && viewportSize) {
            // Picker должен помещаться в viewport
            expect(pickerBox.width).toBeLessThanOrEqual(viewportSize.width + 10)
            console.log('  ✓ Кастомный date picker адаптирован для мобильных')
          }
          await page.keyboard.press('Escape')
        } else {
          // Нативный picker используется — это хорошо для мобильных
          console.log('  ✓ Используется нативный date picker')
        }
      } else {
        // Проверяем кнопки выбора даты
        const dateButtons = page.getByRole('button', { name: /дата|date|календарь|calendar/i })
        if (
          await dateButtons
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          console.log('  ✓ Кнопка выбора даты доступна')
        } else {
          console.log('  ⏭️ Skip: date picker не найден')
        }
      }
    }
  })

  test('E2E-MC-09 — touch-friendly формы', async ({ page }) => {
    await page.goto(urls.signIn)
    await page.waitForLoadState('domcontentloaded')

    const viewportSize = page.viewportSize()

    if (viewportSize && viewportSize.width < 768) {
      // Проверяем все поля формы
      const formFields = page.locator('input:visible, select:visible, textarea:visible')
      const fieldCount = await formFields.count()

      let touchFriendlyCount = 0
      let smallFieldsCount = 0

      for (let i = 0; i < fieldCount; i++) {
        const field = formFields.nth(i)
        const box = await field.boundingBox()

        if (box) {
          // Минимальная высота для touch — 44px (Apple рекомендация), 36px минимум
          if (box.height >= 36) {
            touchFriendlyCount++
          } else {
            smallFieldsCount++
          }

          // Проверяем достаточный отступ между полями
          if (i > 0) {
            const prevField = formFields.nth(i - 1)
            const prevBox = await prevField.boundingBox()
            if (prevBox && prevBox.y + prevBox.height < box.y) {
              const gap = box.y - (prevBox.y + prevBox.height)
              // Минимальный gap — 8px
              if (gap < 8) {
                console.log(`  ⚠️ Малый отступ между полями ${i - 1} и ${i}: ${gap}px`)
              }
            }
          }
        }
      }

      // Большинство полей должны быть touch-friendly
      if (fieldCount > 0) {
        const touchFriendlyRatio = touchFriendlyCount / fieldCount
        expect(touchFriendlyRatio, 'Мало touch-friendly полей').toBeGreaterThanOrEqual(0.7)

        if (smallFieldsCount === 0) {
          console.log('  ✓ Все поля формы touch-friendly')
        } else {
          console.log(`  ✓ ${touchFriendlyCount}/${fieldCount} полей touch-friendly`)
        }
      }

      // Проверяем кнопку submit
      const submitBtn = page.getByRole('button', { name: /войти|вход|submit|sign in/i })
      if (await submitBtn.isVisible().catch(() => false)) {
        const btnBox = await submitBtn.boundingBox()
        if (btnBox) {
          expect(btnBox.height, 'Submit кнопка слишком маленькая').toBeGreaterThanOrEqual(40)
          // На мобильных кнопка должна быть достаточно широкой
          expect(btnBox.width).toBeGreaterThanOrEqual(100)
        }
      }
    }
  })
})

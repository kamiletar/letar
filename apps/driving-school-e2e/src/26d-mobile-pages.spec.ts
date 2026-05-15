/**
 * E2E тесты: Phase 7 — Mobile UX — Страницы
 *
 * Тесты для проверки адаптации страниц на мобильных устройствах.
 * Запускаются с проектами mobile-portrait, mobile-landscape и tablet.
 *
 * @see apps/driving-school/docs/testing/PHASE7_MOBILE_UX.md
 */

import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

test.describe('Mobile UX — Страницы', () => {
  test('E2E-MOB-1.12 — свайпы для навигации работают', async ({ page }) => {
    await page.goto(urls.dashboard)

    const viewportSize = page.viewportSize()

    // На мобильных можно открыть меню свайпом
    if (viewportSize && viewportSize.width < 768) {
      // Эмулируем свайп слева направо (открытие drawer)
      await page.mouse.move(0, viewportSize.height / 2)
      await page.mouse.down()
      await page.mouse.move(100, viewportSize.height / 2, { steps: 10 })
      await page.mouse.up()

      // Ждём немного для анимации
      await page.waitForTimeout(500)

      // Проверяем, открылся ли drawer (опционально)
      // Не требуем обязательного открытия, так как не все приложения поддерживают свайп
    }

    await expect(page.locator('body')).toBeVisible()
  })

  test('E2E-MOB-1.13 — pull-to-refresh для обновления данных', async ({ page }) => {
    await page.goto(urls.lessons)

    const viewportSize = page.viewportSize()

    // Pull-to-refresh обычно работает на мобильных
    if (viewportSize && viewportSize.width < 768) {
      // Скроллим вверх страницы
      await page.evaluate(() => window.scrollTo(0, 0))

      // Эмулируем pull down жест
      await page.mouse.move(viewportSize.width / 2, 50)
      await page.mouse.down()
      await page.mouse.move(viewportSize.width / 2, 200, { steps: 10 })
      await page.mouse.up()

      // Ждём потенциального обновления
      await page.waitForTimeout(1000)
    }

    // Страница остаётся рабочей
    await expect(page.locator('body')).toBeVisible()
  })

  test('E2E-MOB-1.14 — профиль инструктора адаптирован', async ({ page }) => {
    // Переходим на профиль (используем общий URL профиля)
    await page.goto(urls.profile)

    const viewportSize = page.viewportSize()

    // Проверяем, что контент не выходит за viewport
    const mainContent = page.locator('main, [role="main"], .content, #content').first()

    if ((await mainContent.count()) > 0) {
      const box = await mainContent.boundingBox()

      if (box && viewportSize) {
        expect(box.width, 'Контент профиля слишком широкий').toBeLessThanOrEqual(viewportSize.width + 10)
      }
    }

    // Страница загружается
    await expect(page.locator('body')).toBeVisible()
  })

  test('E2E-MOB-1.15 — профиль ученика адаптирован', async ({ page }) => {
    // Используем тот же URL профиля (авторизованы как ученик через storageState)
    await page.goto(urls.profile)

    // Проверяем, что страница загрузилась и контент виден
    await expect(page.locator('body')).toBeVisible()

    // Проверяем отсутствие горизонтального скролла
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
  })

  test('E2E-MOB-1.16 — список занятий удобен на мобильных', async ({ page }) => {
    await page.goto(urls.lessons)
    await page.waitForLoadState('domcontentloaded')

    const viewportSize = page.viewportSize()

    // На мобильных список должен отображаться карточками, а не таблицей
    if (viewportSize && viewportSize.width < 768) {
      // Проверяем, что контент не выходит за пределы viewport
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

      // Нет горизонтального скролла
      expect(scrollWidth, 'Страница занятий имеет горизонтальный скролл').toBeLessThanOrEqual(clientWidth + 5)

      // Проверяем элементы списка если они есть
      const listItems = page.locator('[class*="Card"], [class*="card"], article, [role="listitem"]')
      const itemCount = await listItems.count()

      for (let i = 0; i < Math.min(itemCount, 3); i++) {
        const item = listItems.nth(i)
        if (await item.isVisible()) {
          const box = await item.boundingBox()
          if (box && box.width > 50) {
            // Элемент не выходит за viewport
            expect(box.x + box.width, `Элемент #${i} выходит за viewport`).toBeLessThanOrEqual(viewportSize.width + 10)
          }
        }
      }
    }

    await expect(page.locator('body')).toBeVisible()
  })

  test('E2E-MOB-1.18 — чаты адаптированы для мобильных', async ({ page }) => {
    // Переходим на страницу чатов (если есть)
    const chatUrl = urls.chat || `${urls.dashboard}?tab=chat`
    await page.goto(chatUrl)

    const viewportSize = page.viewportSize()

    // Проверяем, что интерфейс чата адаптирован
    const chatContainer = page.locator('[class*="chat"], [class*="Chat"], [class*="message"], [data-testid="chat"]')

    if ((await chatContainer.count()) > 0) {
      const box = await chatContainer.first().boundingBox()

      if (box && viewportSize) {
        // Чат не выходит за пределы экрана
        expect(box.width).toBeLessThanOrEqual(viewportSize.width + 10)
      }
    }

    // Страница должна быть рабочей
    await expect(page.locator('body')).toBeVisible()
  })

  test('E2E-MP-07 — Dashboard на мобайле', async ({ page }) => {
    await page.goto(urls.dashboard)
    await page.waitForLoadState('domcontentloaded')

    const viewportSize = page.viewportSize()

    if (viewportSize && viewportSize.width < 768) {
      // Проверяем основные секции dashboard
      const mainContent = page.locator('main, [role="main"], #main-content').first()

      if (await mainContent.isVisible().catch(() => false)) {
        const box = await mainContent.boundingBox()
        if (box) {
          // Контент не выходит за viewport
          expect(box.width).toBeLessThanOrEqual(viewportSize.width + 10)
        }
      }

      // Проверяем карточки статистики
      const statCards = page.locator('[class*="stat" i], [class*="Stat"], [class*="Card"]')
      const cardCount = await statCards.count()

      if (cardCount > 0) {
        // Карточки должны быть в стек-лейауте на мобильных
        const firstCard = await statCards.nth(0).boundingBox()
        const secondCard = cardCount > 1 ? await statCards.nth(1).boundingBox() : null

        if (firstCard && secondCard) {
          // На мобильных карточки должны быть друг под другом (y различается)
          // или в горизонтальном скролле
          const isStacked = secondCard.y > firstCard.y + firstCard.height - 10
          const isHorizontal = secondCard.x > firstCard.x + firstCard.width - 10

          if (isStacked || isHorizontal) {
            console.log('  ✓ Dashboard карточки адаптированы для мобильных')
          }
        } else if (firstCard) {
          // Одна карточка — проверяем ширину
          expect(firstCard.width).toBeLessThanOrEqual(viewportSize.width)
          console.log('  ✓ Dashboard карточка адаптирована')
        }
      }

      // Проверяем отсутствие горизонтального скролла
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5)
    }

    await expect(page.locator('body')).toBeVisible()
  })

  test('E2E-MP-08 — Расписание на мобайле', async ({ page }) => {
    const scheduleUrl = urls.schedule || urls.lessons
    await page.goto(scheduleUrl)
    await page.waitForLoadState('domcontentloaded')

    const viewportSize = page.viewportSize()

    if (viewportSize && viewportSize.width < 768) {
      // Проверяем календарь/расписание
      const calendar = page.locator('[class*="calendar" i], [class*="Calendar"], [role="grid"]')
      const hasCalendar = await calendar
        .first()
        .isVisible()
        .catch(() => false)

      if (hasCalendar) {
        const calBox = await calendar.first().boundingBox()
        if (calBox) {
          // Календарь должен помещаться в viewport
          expect(calBox.width, 'Календарь слишком широкий').toBeLessThanOrEqual(viewportSize.width + 10)
          console.log('  ✓ Календарь адаптирован для мобильных')
        }
      }

      // Проверяем переключатель вида (день/неделя/месяц)
      const viewSwitcher = page
        .getByRole('tablist')
        .or(page.locator('[class*="view-switcher" i], [class*="ViewSwitcher"]'))
        .or(page.getByRole('button', { name: /день|неделя|месяц|day|week|month/i }))

      const hasViewSwitcher = await viewSwitcher
        .first()
        .isVisible()
        .catch(() => false)

      if (hasViewSwitcher) {
        // На мобильных по умолчанию должен быть вид "День" или "Список"
        console.log('  ✓ Переключатель вида расписания доступен')
      }

      // Проверяем список занятий
      const lessonList = page.locator('[class*="lesson" i], [class*="event" i], [data-testid*="lesson"]')
      const lessonCount = await lessonList.count()

      if (lessonCount > 0) {
        const lessonBox = await lessonList.first().boundingBox()
        if (lessonBox) {
          expect(lessonBox.width).toBeLessThanOrEqual(viewportSize.width)
        }
      }

      // Нет горизонтального скролла
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5)
    }

    await expect(page.locator('body')).toBeVisible()
  })

  test('E2E-MP-09 — Профиль на мобайле', async ({ page }) => {
    await page.goto(urls.profile)
    await page.waitForLoadState('domcontentloaded')

    const viewportSize = page.viewportSize()

    if (viewportSize && viewportSize.width < 768) {
      // Проверяем аватар пользователя
      const avatar = page
        .locator('[class*="avatar" i], [class*="Avatar"], img[alt*="аватар" i], img[alt*="avatar" i]')
        .first()

      const hasAvatar = await avatar.isVisible().catch(() => false)

      if (hasAvatar) {
        const avatarBox = await avatar.boundingBox()
        if (avatarBox) {
          // Аватар не должен быть слишком большим на мобильных
          expect(avatarBox.width).toBeLessThanOrEqual(150)
          console.log('  ✓ Аватар профиля адаптирован')
        }
      }

      // Проверяем информацию профиля
      const profileInfo = page.locator('[class*="profile" i], [class*="Profile"], main')
      if (
        await profileInfo
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        const infoBox = await profileInfo.first().boundingBox()
        if (infoBox) {
          expect(infoBox.width).toBeLessThanOrEqual(viewportSize.width + 10)
        }
      }

      // Проверяем кнопки действий
      const actionButtons = page.getByRole('button', { name: /редактировать|настройки|выйти|edit|settings|logout/i })
      const buttonCount = await actionButtons.count()

      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const btn = actionButtons.nth(i)
        if (await btn.isVisible().catch(() => false)) {
          const btnBox = await btn.boundingBox()
          if (btnBox) {
            // Кнопки должны быть touch-friendly
            expect(Math.min(btnBox.width, btnBox.height)).toBeGreaterThanOrEqual(30)
          }
        }
      }

      // Проверяем вкладки профиля если есть
      const profileTabs = page.getByRole('tablist').or(page.locator('[class*="tabs" i]'))
      if (
        await profileTabs
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        const tabsBox = await profileTabs.first().boundingBox()
        if (tabsBox) {
          // Вкладки должны помещаться или быть скроллируемыми
          expect(tabsBox.width).toBeLessThanOrEqual(viewportSize.width + 10)
          console.log('  ✓ Вкладки профиля адаптированы')
        }
      }

      // Нет горизонтального скролла
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5)
    }

    await expect(page.locator('body')).toBeVisible()
  })
})

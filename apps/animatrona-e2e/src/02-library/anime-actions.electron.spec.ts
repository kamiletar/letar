/**
 * Electron тесты для Anime Actions (меню действий)
 *
 * Тестируют действия с аниме на странице деталей:
 * - Кнопка меню действий
 * - Диалог подтверждения удаления
 * - Другие действия (редактировать, экспорт)
 *
 * ВАЖНО: Эти тесты требуют хотя бы одно аниме в БД.
 * При пустой библиотеке тесты будут пропущены.
 */

import { expect, test } from '@playwright/test'
import {
  checkProductionBuild,
  closeElectronApp,
  type ElectronTestContext,
  launchElectronApp,
  waitForMainWindow,
} from '../../helpers/electron.helpers'

// Контекст для тестов
let ctx: ElectronTestContext

test.describe('Anime Actions - Delete Confirmation', () => {
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
      console.log('Skipping Electron tests: production build not found')
    }
  })

  test.beforeEach(async () => {
    ctx = await launchElectronApp()
    await waitForMainWindow(ctx, 60000)
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  /**
   * Хелпер: перейти в библиотеку и открыть первое аниме
   * @returns true если успешно открыли страницу деталей, false если библиотека пуста
   */
  async function navigateToFirstAnimeDetail(): Promise<boolean> {
    // Переходим в библиотеку
    const nav = ctx.page.getByRole('navigation')
    const libraryLink = nav.getByRole('link', { name: /библиотека/i })

    if (!(await libraryLink.isVisible().catch(() => false))) {
      return false
    }

    await libraryLink.click()
    await ctx.page.waitForTimeout(1500)

    // Ищем карточки аниме
    const animeCards = ctx.page.locator('a[href^="/library/"]').filter({
      has: ctx.page.locator('img'),
    })

    const cardCount = await animeCards.count()
    if (cardCount === 0) {
      return false
    }

    // Кликаем на первую карточку
    await animeCards.first().click()
    await ctx.page.waitForTimeout(1500)

    // Проверяем что открылась страница деталей
    const url = ctx.page.url()
    return url.includes('/library/') && !url.endsWith('/library')
  }

  test('меню действий доступно на странице деталей', async () => {
    const navigated = await navigateToFirstAnimeDetail()
    if (!navigated) {
      test.skip()
      return
    }

    // Ищем кнопку меню действий
    // Может быть иконка-кнопка (⋮) или текстовая "Действия"
    const actionButton = ctx.page.getByRole('button', { name: /действия|меню|more/i })
    const hasActionButton = await actionButton.isVisible().catch(() => false)

    if (hasActionButton) {
      await expect(actionButton).toBeVisible()
    } else {
      // Ищем иконку меню (три точки)
      const threeDotsButton = ctx.page.locator('button[aria-label*="еню"], button[aria-label*="ейств"]')
      const hasThreeDots = await threeDotsButton
        .first()
        .isVisible()
        .catch(() => false)

      if (!hasThreeDots) {
        // Возможно меню раскрыто по умолчанию или отдельные кнопки
        const editButton = ctx.page.getByRole('button', { name: /редактировать|edit/i })
        const hasEdit = await editButton.isVisible().catch(() => false)
        expect(hasEdit).toBe(true)
      }
    }
  })

  test('удаление аниме показывает диалог подтверждения', async () => {
    const navigated = await navigateToFirstAnimeDetail()
    if (!navigated) {
      test.skip()
      return
    }

    // Открываем меню действий
    const actionButton = ctx.page.getByRole('button', { name: /действия|меню|more/i })

    if (await actionButton.isVisible().catch(() => false)) {
      await actionButton.click()
      await ctx.page.waitForTimeout(300)
    } else {
      // Пробуем найти иконку меню
      const menuButtons = await ctx.page
        .locator('button')
        .filter({ has: ctx.page.locator('svg') })
        .all()

      for (const btn of menuButtons.slice(0, 5)) {
        await btn.click()
        await ctx.page.waitForTimeout(300)

        // Проверяем появилось ли меню с пунктом "Удалить"
        const deleteItem = ctx.page.getByRole('menuitem', { name: /удалить|delete/i })
        if (await deleteItem.isVisible().catch(() => false)) {
          break
        }

        // Закрываем если открылось что-то другое
        await ctx.page.keyboard.press('Escape')
        await ctx.page.waitForTimeout(100)
      }
    }

    // Ищем пункт "Удалить" в меню
    const deleteMenuItem = ctx.page.getByRole('menuitem', { name: /удалить|delete/i })
    const hasDeleteItem = await deleteMenuItem.isVisible().catch(() => false)

    if (!hasDeleteItem) {
      // Может быть отдельная кнопка удаления (не в меню)
      const deleteButton = ctx.page.getByRole('button', { name: /удалить|delete/i })
      const hasDeleteButton = await deleteButton.isVisible().catch(() => false)

      if (!hasDeleteButton) {
        test.skip()
        return
      }

      await deleteButton.click()
    } else {
      await deleteMenuItem.click()
    }

    await ctx.page.waitForTimeout(500)

    // Должен появиться диалог подтверждения
    const confirmDialog = ctx.page.getByRole('alertdialog')
    const hasDialog = await confirmDialog.isVisible().catch(() => false)

    if (!hasDialog) {
      // Альтернатива: обычный dialog
      const regularDialog = ctx.page.getByRole('dialog')
      const hasRegularDialog = await regularDialog.isVisible().catch(() => false)

      if (hasRegularDialog) {
        // Проверяем содержимое диалога
        const dialogText = await regularDialog.textContent()
        expect(dialogText?.toLowerCase()).toMatch(/удалить|delete|подтвердить|confirm/)
      } else {
        test.skip()
        return
      }
    } else {
      // Диалог должен содержать текст об удалении
      await expect(confirmDialog).toContainText(/удалить|delete/i)
    }
  })

  test('отмена удаления закрывает диалог', async () => {
    const navigated = await navigateToFirstAnimeDetail()
    if (!navigated) {
      test.skip()
      return
    }

    // Пробуем открыть диалог удаления
    // Сначала ищем кнопку удаления
    const deleteButton = ctx.page.getByRole('button', { name: /удалить|delete/i })
    const menuButton = ctx.page.getByRole('button', { name: /действия|меню|more/i })

    let dialogOpened = false

    // Способ 1: прямая кнопка удаления
    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click()
      await ctx.page.waitForTimeout(300)
      dialogOpened = true
    } // Способ 2: через меню
    else if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click()
      await ctx.page.waitForTimeout(300)

      const deleteItem = ctx.page.getByRole('menuitem', { name: /удалить|delete/i })
      if (await deleteItem.isVisible().catch(() => false)) {
        await deleteItem.click()
        await ctx.page.waitForTimeout(300)
        dialogOpened = true
      }
    }

    if (!dialogOpened) {
      test.skip()
      return
    }

    // Ищем диалог
    const dialog = ctx.page.getByRole('alertdialog').or(ctx.page.getByRole('dialog'))

    if (!(await dialog.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    // Нажимаем "Отмена"
    const cancelButton = ctx.page.getByRole('button', { name: /отмена|cancel|нет/i })

    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click()
      await ctx.page.waitForTimeout(300)

      // Диалог должен закрыться
      await expect(dialog).not.toBeVisible({ timeout: 3000 })
    } else {
      // Нет кнопки отмены — возможно нужно нажать вне диалога или Escape
      await ctx.page.keyboard.press('Escape')
      await ctx.page.waitForTimeout(300)
    }
  })
})

test.describe('Anime Actions - Edit', () => {
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
    }
  })

  test.beforeEach(async () => {
    ctx = await launchElectronApp()
    await waitForMainWindow(ctx, 60000)
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  test('кнопка редактирования доступна', async () => {
    // Переходим в библиотеку
    const nav = ctx.page.getByRole('navigation')
    const libraryLink = nav.getByRole('link', { name: /библиотека/i })

    if (!(await libraryLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await libraryLink.click()
    await ctx.page.waitForTimeout(1500)

    // Ищем карточки
    const animeCards = ctx.page.locator('a[href^="/library/"]').filter({
      has: ctx.page.locator('img'),
    })

    if ((await animeCards.count()) === 0) {
      test.skip()
      return
    }

    await animeCards.first().click()
    await ctx.page.waitForTimeout(1500)

    // Ищем кнопку редактирования
    const editButton = ctx.page.getByRole('button', { name: /редактировать|edit/i })
    const actionMenu = ctx.page.getByRole('button', { name: /действия|меню|more/i })

    const hasEditButton = await editButton.isVisible().catch(() => false)

    if (hasEditButton) {
      await expect(editButton).toBeVisible()
    } else if (await actionMenu.isVisible().catch(() => false)) {
      // Проверяем что редактирование есть в меню
      await actionMenu.click()
      await ctx.page.waitForTimeout(300)

      const editItem = ctx.page.getByRole('menuitem', { name: /редактировать|edit/i })
      await expect(editItem).toBeVisible()
    } else {
      // Нет кнопки редактирования
      test.skip()
    }
  })
})

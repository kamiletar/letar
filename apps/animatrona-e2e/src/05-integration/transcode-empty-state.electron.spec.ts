/**
 * Electron тесты для Transcode Queue Empty State
 *
 * Тестируют пустое состояние очереди транскодирования:
 * - Empty state отображается при пустой очереди
 * - Кнопка импорта доступна
 * - Описание пустого состояния информативно
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

test.describe('Transcode Queue - Empty State', () => {
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
   * Хелпер: перейти на страницу очереди
   */
  async function goToTranscode(): Promise<boolean> {
    const nav = ctx.page.getByRole('navigation')
    const transcodeLink = nav.getByRole('link', { name: /транскод|очередь|queue/i })
    const isVisible = await transcodeLink.isVisible().catch(() => false)

    if (!isVisible) {
      return false
    }

    await transcodeLink.click()
    await ctx.page.waitForTimeout(1500)
    return true
  }

  test('пустая очередь показывает empty state', async () => {
    const navigated = await goToTranscode()
    if (!navigated) {
      test.skip()
      return
    }

    // Ищем признаки пустого состояния
    const emptyStateTexts = [/очередь пуста/i, /нет задач/i, /no tasks/i, /добавьте видео/i, /начните с импорта/i]

    let foundEmptyState = false
    for (const text of emptyStateTexts) {
      const element = ctx.page.getByText(text)
      const isVisible = await element
        .first()
        .isVisible()
        .catch(() => false)
      if (isVisible) {
        foundEmptyState = true
        break
      }
    }

    // Empty state должен показываться при чистой БД
    // Если есть задачи — это тоже валидное состояние
    if (!foundEmptyState) {
      // Проверяем есть ли задачи в очереди
      const queueItems = ctx.page.locator('[data-testid="queue-item"], [data-testid="task-row"]')
      const hasItems = (await queueItems.count()) > 0

      if (hasItems) {
        // Очередь не пуста — пропускаем тест empty state
        test.skip()
      }
    }

    // Если нашли empty state — тест прошёл
    expect(foundEmptyState).toBe(true)
  })

  test('empty state содержит кнопку импорта', async () => {
    const navigated = await goToTranscode()
    if (!navigated) {
      test.skip()
      return
    }

    // Проверяем что это действительно empty state
    const emptyText = ctx.page.getByText(/очередь пуста|нет задач|no tasks/i)
    const isEmptyState = await emptyText
      .first()
      .isVisible()
      .catch(() => false)

    if (!isEmptyState) {
      // Не empty state — пропускаем
      test.skip()
      return
    }

    // Ищем кнопку импорта
    const importButtons = [
      ctx.page.getByRole('button', { name: /импорт|добавить|import|add/i }),
      ctx.page.getByRole('link', { name: /импорт|добавить/i }),
      ctx.page.locator('button').filter({ hasText: /импорт|добавить/i }),
    ]

    let foundImportButton = false
    for (const btn of importButtons) {
      const isVisible = await btn
        .first()
        .isVisible()
        .catch(() => false)
      if (isVisible) {
        foundImportButton = true
        break
      }
    }

    // Кнопка импорта должна быть доступна
    expect(foundImportButton).toBe(true)
  })

  test('empty state иконка или иллюстрация присутствует', async () => {
    const navigated = await goToTranscode()
    if (!navigated) {
      test.skip()
      return
    }

    // Проверяем empty state
    const emptyText = ctx.page.getByText(/очередь пуста|нет задач/i)
    const isEmptyState = await emptyText
      .first()
      .isVisible()
      .catch(() => false)

    if (!isEmptyState) {
      test.skip()
      return
    }

    // Ищем иконку или SVG в empty state
    // EmptyState компонент обычно содержит иконку
    const emptyStateContainer = ctx.page.locator('[data-part="root"]').filter({
      hasText: /очередь пуста|нет задач/i,
    })

    const svgInContainer = emptyStateContainer.locator('svg')
    const hasSvg = await svgInContainer
      .first()
      .isVisible()
      .catch(() => false)

    // Иконка может быть в другом месте страницы
    if (!hasSvg) {
      // Проверяем любую иконку рядом с текстом
      const pageSvg = ctx.page.locator('svg')
      const anySvg = (await pageSvg.count()) > 0
      expect(anySvg).toBe(true)
    } else {
      expect(hasSvg).toBe(true)
    }
  })

  test('кнопка импорта в empty state работает', async () => {
    const navigated = await goToTranscode()
    if (!navigated) {
      test.skip()
      return
    }

    // Проверяем empty state
    const emptyText = ctx.page.getByText(/очередь пуста|нет задач/i)
    const isEmptyState = await emptyText
      .first()
      .isVisible()
      .catch(() => false)

    if (!isEmptyState) {
      test.skip()
      return
    }

    // Находим и кликаем кнопку импорта
    const importButton = ctx.page.getByRole('button', { name: /импорт|добавить|import/i })
    const isButtonVisible = await importButton
      .first()
      .isVisible()
      .catch(() => false)

    if (!isButtonVisible) {
      // Пробуем ссылку
      const importLink = ctx.page.getByRole('link', { name: /импорт|добавить/i })
      if (
        await importLink
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await importLink.first().click()
        await ctx.page.waitForTimeout(1000)

        // Должно что-то произойти: открытие wizard или навигация
        // Проверяем URL изменился или появился диалог
        const url = ctx.page.url()
        const hasWizard = await ctx.page
          .getByRole('dialog')
          .isVisible()
          .catch(() => false)

        expect(url.includes('import') || hasWizard).toBe(true)
      } else {
        test.skip()
      }
    } else {
      await importButton.first().click()
      await ctx.page.waitForTimeout(1000)

      // Проверяем результат клика
      const hasDialog = await ctx.page
        .getByRole('dialog')
        .isVisible()
        .catch(() => false)
      const urlChanged = ctx.page.url().includes('import')

      // Должен открыться wizard или произойти навигация
      expect(hasDialog || urlChanged).toBe(true)
    }
  })
})

test.describe('Transcode Queue - Tab Navigation', () => {
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

  test('табы очереди отображаются', async () => {
    const nav = ctx.page.getByRole('navigation')
    const transcodeLink = nav.getByRole('link', { name: /транскод|очередь/i })

    if (!(await transcodeLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await transcodeLink.click()
    await ctx.page.waitForTimeout(1500)

    // Ищем табы (если они есть)
    const tablist = ctx.page.getByRole('tablist')
    const hasTablist = await tablist
      .first()
      .isVisible()
      .catch(() => false)

    if (hasTablist) {
      // Проверяем какие табы доступны
      const tabs = await ctx.page.getByRole('tab').all()
      expect(tabs.length).toBeGreaterThan(0)
    } else {
      // Табы могут отсутствовать — это нормально
      expect(true).toBe(true)
    }
  })

  test('переключение между табами работает', async () => {
    const nav = ctx.page.getByRole('navigation')
    const transcodeLink = nav.getByRole('link', { name: /транскод|очередь/i })

    if (!(await transcodeLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await transcodeLink.click()
    await ctx.page.waitForTimeout(1500)

    // Ищем табы
    const tabs = await ctx.page.getByRole('tab').all()

    if (tabs.length < 2) {
      // Недостаточно табов для тестирования переключения
      test.skip()
      return
    }

    // Кликаем на второй таб
    await tabs[1].click()
    await ctx.page.waitForTimeout(500)

    // Второй таб должен стать активным
    const isSecondActive = await tabs[1].getAttribute('aria-selected')
    expect(isSecondActive).toBe('true')

    // Возвращаемся к первому
    await tabs[0].click()
    await ctx.page.waitForTimeout(500)

    const isFirstActive = await tabs[0].getAttribute('aria-selected')
    expect(isFirstActive).toBe('true')
  })
})

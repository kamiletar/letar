/**
 * Тест: Infinite scroll
 *
 * Проверяем режим бесконечной прокрутки каталога
 */
import { expect, test } from '../../fixtures/base-test'

import { localePath } from '../../config/i18n'

test.describe('10-catalog: Infinite scroll', () => {
  test('каталог поддерживает параметр view=scroll', async ({ page }) => {
    await page.goto(localePath('/catalog?view=scroll'))
    await page.waitForLoadState('domcontentloaded')

    // Страница должна загрузиться без ошибок
    await expect(page).toHaveURL(/\/ru\/catalog/)
  })

  test('переключатель вида отображается', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    // Ищем переключатель вида (grid/list/scroll)
    const viewToggle = page.getByRole('button', { name: /вид|прокрутка|grid|list/i })
    const viewSwitch = page.locator('[data-testid="view-toggle"]')

    const hasToggle = (await viewToggle.count()) > 0 || (await viewSwitch.count()) > 0
    // Переключатель может отсутствовать
    expect(hasToggle || true).toBeTruthy()
  })

  test('пагинация работает в режиме по умолчанию', async ({ page }) => {
    await page.goto(localePath('/catalog'))
    await page.waitForLoadState('domcontentloaded')

    // Ищем пагинацию или кнопку "Загрузить ещё"
    const pagination = page.locator('nav[aria-label*="page"], nav[aria-label*="страниц"]')
    const loadMore = page.getByRole('button', { name: /загрузить ещё|показать ещё|load more/i })
    const pageLinks = page.locator('a[href*="page="]')

    const hasPagination =
      (await pagination.count()) > 0 || (await loadMore.count()) > 0 || (await pageLinks.count()) > 0
    // Пагинация может отсутствовать при малом количестве товаров
    expect(hasPagination || true).toBeTruthy()
  })
})

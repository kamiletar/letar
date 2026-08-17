import { expect, test } from '@playwright/test'

test.describe('Внутренняя навигация и консистентность страницы', () => {
  test('на странице нет ошибок в консоли браузера при загрузке', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    expect(consoleErrors).toEqual([])
  })

  test('все внутренние ссылки на странице не ведут на 404 (кроме внешних доменов)', async ({ page, request }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute('href')).filter((href): href is string => Boolean(href))
      )

    const internalHrefs = [...new Set(hrefs)].filter((href) => href.startsWith('/') && !href.startsWith('//'))

    for (const href of internalHrefs) {
      const response = await request.get(href)
      expect(response.status(), `внутренняя ссылка ${href} не должна вести на ошибку`).toBeLessThan(400)
    }
  })

  test('переход по ссылке в новой вкладке не ломает текущую страницу (главная остаётся доступной)', async ({ page, context }) => {
    await page.goto('/')

    const pagePromise = context.waitForEvent('page')
    await page.locator('a[href="https://kami.letar.best"]').first().click()
    const newPage = await pagePromise

    // Текущая страница осталась на главной
    await expect(page).toHaveURL('/')

    await newPage.close()
  })
})

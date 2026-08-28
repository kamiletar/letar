import { expect, test } from '@playwright/test'

test.describe('Главная страница', () => {
  test('загружается с правильным заголовком и мета-описанием', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Letar/)

    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveAttribute('content', /Экосистема/)
  })

  test('отображается hero-секция с заголовком Letar', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toHaveText('Letar')
    await expect(page.getByText('Экосистема веб-приложений', { exact: false })).toBeVisible()
  })

  test('отображаются все категории проектов', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Веб-приложения' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Десктоп и мобильные' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Инфраструктура' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Библиотеки' })).toBeVisible()
  })

  test('каталог содержит актуальные ссылки на Studio Letar и личный сайт Kami', async ({ page }) => {
    await page.goto('/')

    const studioCard = page.locator('a[href="https://studio.letar.best"]').first()
    await expect(studioCard).toBeVisible()
    await expect(studioCard).toHaveAttribute('target', '_blank')
    await expect(studioCard).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(studioCard.getByText('Studio Letar')).toBeVisible()

    const kamiCard = page.locator('a[href="https://kami.letar.best"]').first()
    await expect(kamiCard).toBeVisible()
    await expect(kamiCard).toHaveAttribute('target', '_blank')
    await expect(kamiCard).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(kamiCard.getByText('Kami', { exact: true })).toBeVisible()

    await expect(page.getByText('Premium Rosstil', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Integrelle', { exact: true })).toHaveCount(0)
  })

  test('проекты без ссылки (десктопные) рендерятся без <a>-обёртки', async ({ page }) => {
    await page.goto('/')

    // Animatrona Mobile — url: null, карточка не должна быть кликабельной ссылкой
    const heading = page.getByText('Animatrona Mobile', { exact: true })
    await expect(heading).toBeVisible()

    const wrappingLink = page.locator('a', { has: page.getByText('Animatrona Mobile', { exact: true }) })
    await expect(wrappingLink).toHaveCount(0)
  })

  test('отображается footer с копирайтом и версией сборки', async ({ page }) => {
    await page.goto('/')

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    await expect(footer.getByText('© 2026 Letar')).toBeVisible()
  })

  test('robots.txt и sitemap.xml отдаются корректно', async ({ request }) => {
    const robotsResponse = await request.get('/robots.txt')
    expect(robotsResponse.ok()).toBeTruthy()
    const robotsBody = await robotsResponse.text()
    expect(robotsBody).toContain('Allow: /')
    expect(robotsBody).toContain('Sitemap:')

    const sitemapResponse = await request.get('/sitemap.xml')
    expect(sitemapResponse.ok()).toBeTruthy()
    const sitemapBody = await sitemapResponse.text()
    expect(sitemapBody).toContain('letar.best')
  })

  test('несуществующий маршрут отдаёт 404', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz')

    expect(response?.status()).toBe(404)
  })
})

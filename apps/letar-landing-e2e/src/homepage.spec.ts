import { expect, test } from '@playwright/test'

test.describe('Главная страница', () => {
  test('загружается с правильным заголовком и мета-описанием', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Letar/)

    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveAttribute('content', /экосистема/i)
  })

  test('отображается hero-секция с позиционированием и навигацией', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toContainText('Проекты, которые живут и работают')
    await expect(page.getByText('SYSTEM ONLINE', { exact: false })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Перейти в Studio' })).toHaveAttribute(
      'href',
      'https://studio.letar.best',
    )
    await expect(page.getByRole('link', { name: 'Смотреть каталог' })).toHaveAttribute('href', '#catalog')
  })

  test('показывает реальные превью ключевых сайтов и избранных продуктов', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('img', { name: /главная страница Studio Letar/i })).toBeVisible()
    await expect(page.getByRole('img', { name: /личного сайта Kami/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Проекты с характером' })).toBeVisible()
    await expect(page.getByRole('img', { name: /галерея проекта Mandala/i })).toBeVisible()
    await expect(page.getByRole('img', { name: /лендинг десктопного приложения Animatrona/i })).toBeVisible()
  })

  test('отображаются все категории проектов', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Веб-приложения' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Десктоп и мобильные' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Инфраструктура' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Библиотеки' })).toBeVisible()
  })

  test('категории каталога сворачиваются нативно и доступны с клавиатуры', async ({ page }) => {
    await page.goto('/')

    const infrastructureDetails = page.locator('details', {
      has: page.getByRole('heading', { name: 'Инфраструктура' }),
    })
    await expect(infrastructureDetails).not.toHaveAttribute('open', '')

    const summary = infrastructureDetails.locator('summary')
    await summary.focus()
    await page.keyboard.press('Enter')
    await expect(infrastructureDetails).toHaveAttribute('open', '')
    await expect(infrastructureDetails.getByText('Dashboard', { exact: true })).toBeVisible()
  })

  test('каталог содержит актуальные ссылки на ключевые сайты экосистемы', async ({ page }) => {
    await page.goto('/')

    const studioCard = page.locator('#catalog a[href="https://studio.letar.best"]')
    await expect(studioCard).toBeVisible()
    await expect(studioCard).toHaveAttribute('target', '_blank')
    await expect(studioCard).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(studioCard.getByText('Studio Letar')).toBeVisible()

    const kamiCard = page.locator('#catalog a[href="https://kami.letar.best"]')
    await expect(kamiCard).toBeVisible()
    await expect(kamiCard).toHaveAttribute('target', '_blank')
    await expect(kamiCard).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(kamiCard.getByText('Kami', { exact: true })).toBeVisible()

    const svoichuzhieCard = page.locator('#catalog a[href="https://svoichuzhie.ru"]')
    await expect(svoichuzhieCard).toBeVisible()
    await expect(svoichuzhieCard).toHaveAttribute('target', '_blank')
    await expect(svoichuzhieCard.getByText('Свои Чужие', { exact: true })).toBeVisible()

    const domWellbesCard = page.locator('#catalog a[href="https://domwellbes.ru"]')
    await expect(domWellbesCard).toBeVisible()
    await expect(domWellbesCard).toHaveAttribute('target', '_blank')
    await expect(domWellbesCard.getByText('DomWellbes', { exact: true })).toBeVisible()

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

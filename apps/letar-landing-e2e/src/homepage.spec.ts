import { expect, test } from '@playwright/test'

test.describe('Главная страница', () => {
  test('загружается с полным набором SEO-метаданных и структурированных данных', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Letar/)

    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveAttribute('content', /экосистема/i)

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://letar.best/')
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /opengraph-image/)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https?:\/\//)
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200')
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630')
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /twitter-image/)

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents()
    const structuredData = jsonLd.join('\n')
    expect(structuredData).toContain('"@type":"WebSite"')
    expect(structuredData).toContain('"@type":"Organization"')
    expect(structuredData).toContain('"@type":"ItemList"')
    expect(structuredData).toContain('"numberOfItems":25')
    expect(structuredData).toContain('"name":"DomWellbes"')
  })

  test('социальные карточки генерируются как PNG-изображения', async ({ page, request }) => {
    await page.goto('/')

    const ogImageUrl = await page.locator('meta[property="og:image"]').evaluate((element) =>
      element.getAttribute('content')
    )
    const twitterImageUrl = await page
      .locator('meta[name="twitter:image"]')
      .evaluate((element) => element.getAttribute('content'))

    expect(ogImageUrl).toBeTruthy()
    expect(twitterImageUrl).toBeTruthy()

    const ogImageResponse = await request.get(ogImageUrl!)
    expect(ogImageResponse.ok()).toBeTruthy()
    expect(ogImageResponse.headers()['content-type']).toContain('image/png')

    const twitterImageResponse = await request.get(twitterImageUrl!)
    expect(twitterImageResponse.ok()).toBeTruthy()
    expect(twitterImageResponse.headers()['content-type']).toContain('image/png')
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
    expect(sitemapBody).toContain('<loc>https://letar.best</loc>')
    expect(sitemapBody).toContain('<loc>https://letar.best/privacy/</loc>')
  })

  test('страница политики имеет собственные metadata, canonical и H1', async ({ page }) => {
    await page.goto('/privacy/')

    await expect(page).toHaveTitle('Политика конфиденциальности | Letar')
    await expect(page.getByRole('heading', { level: 1, name: 'Политика конфиденциальности' })).toBeVisible()
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /cookie/i)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://letar.best/privacy/')
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Политика конфиденциальности | Letar',
    )
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /opengraph-image/)
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /twitter-image/)
  })

  test('несуществующий маршрут отдаёт 404', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz')

    expect(response?.status()).toBe(404)
  })
})

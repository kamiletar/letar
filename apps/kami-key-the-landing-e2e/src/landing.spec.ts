import { expect, test } from '@playwright/test'

test.describe('Главная страница', () => {
  test('загружается и показывает заголовок героя', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveTitle(/KamiKeyThe/)
    await expect(page.locator('h1')).toHaveText('KamiKeyThe')
  })

  test('отображается навигация с логотипом', async ({ page }) => {
    await page.goto('/')

    const nav = page.getByRole('navigation', { name: 'Главная навигация' })
    await expect(nav).toBeVisible()
    await expect(nav.getByText('KamiKeyThe')).toBeVisible()
  })

  test('CTA "Скачать для Windows" ведёт на секцию скачивания', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const ctaLink = page.getByRole('link', { name: /Скачать для Windows/ })
    await expect(ctaLink).toBeVisible()
    await expect(ctaLink).toHaveAttribute('href', '#downloads')

    await ctaLink.click()
    await expect(page).toHaveURL(/#downloads$/)

    // Секция скачивания реально в зоне видимости после клика
    const downloadsHeading = page.getByRole('heading', { name: 'Скачать' })
    await expect(downloadsHeading).toBeInViewport()
  })

  test('секция "Возможности" видна и содержит карточки фич', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Возможности' })).toBeVisible()

    const featuresSection = page.locator('#features')
    await featuresSection.scrollIntoViewIfNeeded()
    await expect(featuresSection.getByText('AltGr → Символы')).toBeVisible()
    await expect(featuresSection.getByText('Визуальный оверлей')).toBeVisible()
  })

  test('секция "Скачать" показывает карточку Windows-версии', async ({ page }) => {
    await page.goto('/')

    const downloadsSection = page.locator('#downloads')
    await downloadsSection.scrollIntoViewIfNeeded()

    await expect(downloadsSection.getByText('Windows 10+')).toBeVisible()
    await expect(downloadsSection.getByRole('button', { name: /Скачать \.exe/ })).toBeVisible()
  })

  test('FAQ-аккордеон раскрывает ответ по клику на вопрос', async ({ page }) => {
    await page.goto('/')

    const faqSection = page.locator('#faq')
    await faqSection.scrollIntoViewIfNeeded()

    const question = faqSection.getByRole('button', { name: 'Что такое AltGr?' })
    await expect(question).toHaveAttribute('aria-expanded', 'false')

    await question.click()
    await expect(question).toHaveAttribute('aria-expanded', 'true')
    await expect(faqSection.getByText(/Правый Alt на клавиатуре/)).toBeVisible()
  })

  test('футер отображается и содержит внешнюю ссылку на letar.best', async ({ page }) => {
    await page.goto('/')

    const footer = page.locator('footer')
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeVisible()

    const letarLink = footer.getByRole('link', { name: /Letar\.best/ })
    await expect(letarLink).toHaveAttribute('href', 'https://letar.best')
    await expect(letarLink).toHaveAttribute('target', '_blank')
  })
})

test.describe('Служебные эндпоинты', () => {
  test('health-check отдаёт статус ok', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.app).toBe('kami-key-the-landing')
  })

  test('несуществующий маршрут отдаёт 404, а не падает с ошибкой сервера', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz')
    expect(response?.status()).toBe(404)
  })
})

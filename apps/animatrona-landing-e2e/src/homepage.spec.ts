import { expect, test } from '@playwright/test'

test.describe('Главная страница', () => {
  test('загружается с правильным title и заголовком Hero-секции', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveTitle(/Animatrona/)

    // Заголовок Hero-секции содержит название приложения
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Animatrona')
  })

  test('Navbar виден и содержит ссылку на GitHub', async ({ page }) => {
    await page.goto('/')

    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible()

    // Ссылка на GitHub-репозиторий видна на десктопе
    const githubLink = nav.getByRole('link', { name: 'GitHub' })
    await expect(githubLink).toBeVisible()
    await expect(githubLink).toHaveAttribute('href', /github\.com\/kamiletar\/letar/)
  })

  test('Footer виден и содержит ссылки на GitHub, релизы и лицензию', async ({ page }) => {
    await page.goto('/')

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    await expect(footer.getByRole('link', { name: 'GitHub' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Релизы' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Лицензия MIT' })).toBeVisible()
  })

  test('ключевые секции отображаются на странице', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Возможности' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Скачать' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Часто задаваемые вопросы' })).toBeVisible()
  })

  test('skip-link для доступности присутствует в DOM', async ({ page }) => {
    await page.goto('/')

    // Skip-link скрыт визуально до фокуса, но должен быть в DOM с корректным href
    const skipLink = page.locator('a.skip-link')
    await expect(skipLink).toHaveAttribute('href', '#main-content')
  })
})

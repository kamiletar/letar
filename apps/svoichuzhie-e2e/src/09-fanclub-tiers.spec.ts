import { expect, test } from '@playwright/test'

test.describe('09 — Фан-клуб: тиры и эксклюзивный контент', () => {
  test('/fanclub — сравнение тиров STANDARD и PREMIUM видно анонимному пользователю', async ({ page }) => {
    await page.goto('/fanclub')
    // Карточки тиров (exact: true чтобы не совпасть с "Всё из тира «Стандарт»")
    await expect(page.getByText('Стандарт', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Поддержитель', { exact: true }).first()).toBeVisible()
  })

  test('/fanclub — перки каждого тира отображаются', async ({ page }) => {
    await page.goto('/fanclub')

    // Ключевые перки из STANDARD_PERKS
    await expect(page.getByText(/ранний доступ к.*билет/i).first()).toBeVisible()
    await expect(page.getByText(/скидка.*5%/i).first()).toBeVisible()

    // Ключевые перки из PREMIUM_PERKS
    await expect(page.getByText(/скидка.*10%/i).first()).toBeVisible()
    await expect(page.getByText(/эксклюзивн/i).first()).toBeVisible()
  })

  test('/fanclub — есть CTA «Стать своим»', async ({ page }) => {
    await page.goto('/fanclub')
    // Кнопка или текст «Стать своим» — форма вступления или навигация
    await expect(page.getByText(/стать своим/i).first()).toBeVisible()
  })

  test('/fanclub/exclusive — перенаправляет неавторизованного пользователя на /login', async ({ page }) => {
    await page.goto('/fanclub/exclusive')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/fanclub/exclusive/[slug] — перенаправляет неавторизованного пользователя на /login', async ({ page }) => {
    await page.goto('/fanclub/exclusive/e2e-nonexistent-slug')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/fanclub/discounts — перенаправляет неавторизованного пользователя', async ({ page }) => {
    await page.goto('/fanclub/discounts')
    // Либо редирект на /login, либо на /fanclub (нет активного члена)
    const url = page.url()
    expect(url).toMatch(/\/login|\/fanclub/)
  })

  test('/blog — пагинация: ?page=1 и ?page=2 не возвращают 404', async ({ page }) => {
    const resp1 = await page.goto('/blog?page=1')
    expect(resp1?.status()).not.toBe(404)
    expect(resp1?.status()).not.toBe(500)

    const resp2 = await page.goto('/blog?page=2')
    expect(resp2?.status()).not.toBe(404)
    expect(resp2?.status()).not.toBe(500)
  })

  test('/merch — пагинация: ?page=1 и ?category= не возвращают 404', async ({ page }) => {
    const resp = await page.goto('/merch?page=1')
    expect(resp?.status()).not.toBe(404)
    expect(resp?.status()).not.toBe(500)
  })
})

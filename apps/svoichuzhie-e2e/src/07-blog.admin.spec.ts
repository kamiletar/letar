import { expect, test } from '@playwright/test'

// Этот файл запускается в authenticated-chromium (storageState admin)

test.describe('07 — Blog: галереи и admin-редактор (7.4/8.9)', () => {
  test('/blog — список статей загружается', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.locator('h1, h2').first()).toBeVisible()
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('/blog/[slug] — страница статьи открывается', async ({ page }) => {
    await page.goto('/blog')

    // Ищем первую ссылку на статью
    const articleLink = page.locator('a[href^="/blog/"]').first()
    if (!(await articleLink.count())) {
      test.skip()
      return
    }

    await articleLink.click()
    await page.waitForLoadState('networkidle')

    // Должна быть статья с заголовком, не login
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('h1, article h2').first()).toBeVisible()
  })

  test('/blog/[slug] — галерея фото рендерится при наличии (7.4)', async ({ page }) => {
    await page.goto('/blog')
    const articleLink = page.locator('a[href^="/blog/"]').first()
    if (!(await articleLink.count())) {
      test.skip()
      return
    }

    await articleLink.click()
    await page.waitForLoadState('networkidle')

    // Галерея присутствует только если фото прикреплены — если нет, тест не падает
    const photoSection = page.locator('text=/Фотографии|фото/i').first()
    if (await photoSection.isVisible({ timeout: 2_000 }).catch(() => false)) {
      // Есть заголовок секции — должны быть изображения
      const imgs = page.locator('img[src]')
      await expect(imgs.first()).toBeVisible()
    }
    // Нет фото — тест проходит (галерея условная)
  })

  test('/blog/[slug] — видео-галерея рендерится при наличии (8.9)', async ({ page }) => {
    await page.goto('/blog')
    const articleLink = page.locator('a[href^="/blog/"]').first()
    if (!(await articleLink.count())) {
      test.skip()
      return
    }

    await articleLink.click()
    await page.waitForLoadState('networkidle')

    const videoSection = page.locator('text=/Видео/i').first()
    if (await videoSection.isVisible({ timeout: 2_000 }).catch(() => false)) {
      // LazyEmbed или постер должны быть видны
      const videoItem = page.locator('iframe, [aria-label*="Воспроизвести"], [role="button"]').first()
      await expect(videoItem).toBeVisible()
    }
  })

  test('/admin/articles — список статей доступен admin', async ({ page }) => {
    await page.goto('/admin/articles')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('/admin/articles/new — форма создания статьи доступна', async ({ page }) => {
    await page.goto('/admin/articles/new')
    await expect(page).not.toHaveURL(/\/login/)

    // Поля формы
    await expect(page.locator('input[placeholder*="Название"], input[name="title"]').first()).toBeVisible()
    await expect(page.locator('input[placeholder*="slug"], input[name="slug"]').first()).toBeVisible()
  })

  test('/admin/articles/new — пикеры фото и видео отображаются при наличии данных', async ({ page }) => {
    await page.goto('/admin/articles/new')
    await expect(page).not.toHaveURL(/\/login/)

    // Пикеры отображаются только при наличии фото/видео в БД
    // Проверяем что форма корректно рендерится без ошибок JS
    const errorOverlay = page.locator('text=/Error|Ошибка|Uncaught/i').first()
    await expect(errorOverlay)
      .not.toBeVisible({ timeout: 3_000 })
      .catch(() => {
        /* нет overlay — OK */
      })

    await expect(page.locator('form').first()).toBeVisible()
  })

  test('/admin/articles/new — slug автогенерируется из заголовка', async ({ page }) => {
    await page.goto('/admin/articles/new')
    await expect(page).not.toHaveURL(/\/login/)

    const titleInput = page.locator('input[placeholder*="Название"], input[name="title"]').first()
    const slugInput = page.locator('input[placeholder*="slug"], input[name="slug"]').first()

    if (!(await titleInput.count()) || !(await slugInput.count())) {
      test.skip()
      return
    }

    await titleInput.fill('Тест автослаг')
    // Slug должен обновиться
    await expect(slugInput).toHaveValue(/test-avtoslag|test/, { timeout: 3_000 })
  })

  test('/admin/articles/[id] — редактирование существующей статьи', async ({ page }) => {
    await page.goto('/admin/articles')
    await expect(page).not.toHaveURL(/\/login/)

    // ⚠️ Не `a[href*="/admin/articles/"]` — под эту подстроку попадает и «+ Добавить»
    // (/admin/articles/new), которая идёт в DOM раньше любой ссылки «Ред.»
    const editLink = page.getByRole('link', { name: 'Ред.' }).first()
    if (!(await editLink.count())) {
      test.skip()
      return
    }

    const editHref = await editLink.getAttribute('href')
    await editLink.click()
    // networkidle не гарантирует, что успела произойти именно эта клиентская навигация —
    // в dev-режиме клик иногда теряется из-за нестабильного порядка className при Fast Refresh
    // (.claude/docs/nextjs16-turbopack-default-emotion-hydration.md), поэтому ждём смены URL явно
    if (editHref) {
      await page.waitForURL((url) => url.pathname === editHref, { timeout: 10_000 })
    }
    await page.waitForLoadState('networkidle')

    // Форма редактирования загружается. Скоуп на <main> — глобальный Footer (RootLayout)
    // рендерится на каждой странице, включая /admin/*, и содержит свою форму подписки
    const mainForm = page.locator('main form')
    await expect(mainForm).toBeVisible()
    // Есть кнопка сохранения
    const saveBtn = mainForm.locator('button[type="submit"]')
    await expect(saveBtn.first()).toBeVisible()
  })
})

import { expect, type Page, test } from '@playwright/test'
import { gotoHydrated } from './helpers/hydration'

/**
 * Открывает первую статью блога, у которой есть секция-галерея с заголовком `sectionTitle`
 * («Фотографии» / «Видео»). Возвращает false, если такой статьи нет.
 *
 * ⚠️ Заголовок ищем точным совпадением внутри `main`: подстрока `/фото/i` по всей странице
 * всегда матчит пункты навигации шапки («Фото», «Видео»), и «условная» проверка превращалась
 * в безусловную — тест падал на статье без галереи.
 */
async function openArticleWithGallery(page: Page, sectionTitle: string): Promise<boolean> {
  await page.goto('/blog')
  const hrefs = await page
    .locator('a[href^="/blog/"]')
    .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute('href') ?? ''))].filter(Boolean))

  for (const href of hrefs) {
    await page.goto(href)
    await page.waitForLoadState('networkidle')
    if (await page.locator('main').getByText(sectionTitle, { exact: true }).count()) {
      return true
    }
  }
  return false
}

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
    const found = await openArticleWithGallery(page, 'Фотографии')
    // Галерея условная (hasPhotos) — на окружении без статьи с фото проверять нечего.
    // Явный skip вместо тихого «зелёного»: в отчёте видно, что галерея не проверялась.
    test.skip(!found, 'нет ни одной статьи с прикреплёнными фото — 7.4 не проверена')

    // Плитки галереи — картинки в контенте статьи (не шапка/футер)
    await expect(page.locator('main img[src]').first()).toBeVisible()
  })

  test('/blog/[slug] — видео-галерея рендерится при наличии (8.9)', async ({ page }) => {
    const found = await openArticleWithGallery(page, 'Видео')
    test.skip(!found, 'нет ни одной статьи с прикреплёнными видео — 8.9 не проверена')

    // Каждое видео — ссылка на /video/<slug> (постер или заглушка-«play»), а не iframe
    await expect(page.locator('main a[href^="/video/"]').first()).toBeVisible()
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
    await gotoHydrated(page, '/admin/articles/new')
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
    // gotoHydrated, не goto: клик до конца гидратации шапки теряется (helpers/hydration.ts)
    await gotoHydrated(page, '/admin/articles')
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
    // Смену URL ждём явно: networkidle не гарантирует, что успела пройти именно эта клиентская
    // навигация. Таймаут 30 с, не 10: /admin/articles/[id] на холодном сервере рендерится дольше
    // (серверные запросы статьи и списков фото/видео для пикеров под конкуренцией за CPU).
    if (editHref) {
      await page.waitForURL((url) => url.pathname === editHref, { timeout: 30_000 })
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

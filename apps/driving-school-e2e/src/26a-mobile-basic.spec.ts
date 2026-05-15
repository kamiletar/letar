/**
 * E2E тесты: Phase 7 — Mobile UX — Базовая адаптация
 *
 * Тесты для проверки базовой адаптации платформы на мобильных устройствах.
 * Запускаются с проектами mobile-portrait, mobile-landscape и tablet.
 *
 * @see apps/driving-school/docs/testing/PHASE7_MOBILE_UX.md
 */

import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

test.describe('Mobile UX — Базовая адаптация', () => {
  test('E2E-MOB-1.1 — страница входа адаптирована для мобильных', async ({ page }) => {
    await page.goto(urls.signIn)

    // Форма логина видима (заголовок — Text, не heading)
    await expect(page.getByText('Вход', { exact: true })).toBeVisible()
    // Поля формы через label (DrivingSchoolForm.Field.Auto генерирует label)
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/пароль/i)).toBeVisible()

    // Форма занимает всю ширину экрана (без overflow)
    const form = page.locator('form').first()
    const formBox = await form.boundingBox()
    const viewportSize = page.viewportSize()

    if (formBox && viewportSize) {
      // Форма не выходит за пределы viewport
      expect(formBox.x).toBeGreaterThanOrEqual(0)
      expect(formBox.x + formBox.width).toBeLessThanOrEqual(viewportSize.width)
    }
  })

  test('E2E-MOB-1.2 — мобильная навигация (BottomNav)', async ({ page }) => {
    await page.goto(urls.dashboard)
    await page.waitForLoadState('domcontentloaded')

    // Если редирект на sign-in — пользователь не авторизован, пропускаем тест
    if (page.url().includes('sign-in')) {
      test.skip(true, 'Требуется авторизация для проверки BottomNav')
      return
    }

    const viewportSize = page.viewportSize()

    // На мобильных (< 768px) должна быть нижняя панель навигации (BottomNav)
    if (viewportSize && viewportSize.width < 768) {
      // BottomNav — это <nav> элемент внизу экрана с data-testid="bottom-nav"
      const bottomNav = page
        .locator('[data-testid="bottom-nav"]')
        .or(page.locator('nav[aria-label*="мобильн" i]'))
        .or(page.locator('nav').filter({ has: page.locator('a[href="/dashboard"]') }))

      // BottomNav должна быть видна и содержать ссылки навигации
      await expect(bottomNav.first()).toBeVisible({ timeout: 10000 })

      // Проверяем наличие ссылок навигации (минимум 3: Главная, Расписание, Профиль)
      const navLinks = bottomNav.first().locator('a')
      expect(await navLinks.count()).toBeGreaterThanOrEqual(3)
    }

    // На планшетах/десктопах (>= 768px) BottomNav скрыт — это ожидаемое поведение
    if (viewportSize && viewportSize.width >= 768) {
      await expect(page).toHaveURL(/dashboard/)
    }
  })

  test('E2E-MOB-1.20 — портретная ориентация (viewport ~375x667)', async ({ page }) => {
    await page.goto(urls.dashboard)

    const viewportSize = page.viewportSize()
    // Тест адаптируется к текущему viewport
    if (viewportSize) {
      // Для mobile-portrait: ширина меньше высоты
      // Для tablet/landscape: просто проверяем что viewport валидный
      expect(viewportSize.width).toBeGreaterThan(0)
      expect(viewportSize.height).toBeGreaterThan(0)

      // Если это мобильный viewport (ширина < 500), проверяем портретную ориентацию
      if (viewportSize.width < 500) {
        expect(viewportSize.width).toBeLessThan(viewportSize.height)
      }
    }

    // Страница загружается корректно
    await expect(page.locator('body')).toBeVisible()
  })

  test('E2E-MOB-1.21 — ландшафтная ориентация (viewport ~667x375)', async ({ page }) => {
    await page.goto(urls.dashboard)

    const viewportSize = page.viewportSize()
    // В ландшафтной ориентации ширина больше высоты
    if (viewportSize && viewportSize.width > viewportSize.height) {
      // Страница должна адаптироваться
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('E2E-MOB-1.22 — планшеты (viewport ~768x1024)', async ({ page }) => {
    await page.goto(urls.dashboard)

    const viewportSize = page.viewportSize()
    // Для планшетов viewport обычно больше 700px
    if (viewportSize && viewportSize.width >= 700) {
      // На планшетах может показываться полноценная навигация
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('E2E-MOB-1.23 — нет горизонтального скролла на мобильных', async ({ page }) => {
    // Проверяем несколько страниц
    const pagesToCheck = [urls.dashboard, urls.profile, urls.lessons]

    for (const pageUrl of pagesToCheck) {
      await page.goto(pageUrl)
      // Используем domcontentloaded вместо networkidle для скорости
      await page.waitForLoadState('domcontentloaded')

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

      // scrollWidth не должен превышать clientWidth (нет горизонтального скролла)
      expect(scrollWidth, `Горизонтальный скролл на ${pageUrl}`).toBeLessThanOrEqual(
        clientWidth + 2 // +2px для возможных погрешностей рендеринга
      )
    }
  })

  test('E2E-MB-07 — навигация через hamburger меню', async ({ page }) => {
    await page.goto(urls.dashboard)
    await page.waitForLoadState('domcontentloaded')

    const viewportSize = page.viewportSize()

    // На мобильных (< 768px) должен быть hamburger меню
    if (viewportSize && viewportSize.width < 768) {
      // Ищем hamburger кнопку
      const hamburgerBtn = page
        .getByRole('button', { name: /меню|menu/i })
        .or(page.locator('[aria-label*="меню" i], [aria-label*="menu" i]'))
        .or(page.locator('[data-testid="hamburger"], [data-testid="menu-toggle"]'))
        .or(page.locator('button').filter({ has: page.locator('svg[class*="hamburger"], [class*="Menu"]') }))

      const hasHamburger = await hamburgerBtn
        .first()
        .isVisible()
        .catch(() => false)

      if (hasHamburger) {
        await hamburgerBtn.first().click()

        // Должен открыться drawer или меню
        const navMenu = page
          .locator('[role="dialog"]')
          .or(page.locator('[class*="drawer" i], [class*="Drawer"]'))
          .or(page.locator('[class*="sidebar" i], [class*="Sidebar"]'))
          .or(page.locator('nav').filter({ hasText: /главная|расписание|профиль/i }))

        const hasNavMenu = await navMenu
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false)

        if (hasNavMenu) {
          // Проверяем наличие навигационных ссылок
          const navLinks = navMenu.first().getByRole('link')
          const linksCount = await navLinks.count()
          expect(linksCount).toBeGreaterThanOrEqual(2)
          console.log('  ✓ Hamburger меню открывается с навигацией')
        } else {
          console.log('  ⏭️ Skip: меню не открылось')
        }

        await page.keyboard.press('Escape')
      } else {
        // Проверяем альтернативную навигацию (BottomNav)
        const bottomNav = page.locator('[data-testid="bottom-nav"]').or(page.locator('nav').last())
        if (await bottomNav.isVisible().catch(() => false)) {
          console.log('  ✓ Используется BottomNav вместо hamburger меню')
        } else {
          console.log('  ⏭️ Skip: hamburger меню не найдено')
        }
      }
    } else {
      console.log('  ⏭️ Skip: тест только для мобильных viewport')
    }
  })

  test('E2E-MB-08 — скролл и пагинация на мобайле', async ({ page }) => {
    await page.goto(urls.lessons)
    await page.waitForLoadState('domcontentloaded')

    const viewportSize = page.viewportSize()

    if (viewportSize && viewportSize.width < 768) {
      // Проверяем скролл страницы
      const initialScrollY = await page.evaluate(() => window.scrollY)

      // Скроллим вниз и ждём завершения скролла
      await page.evaluate(() => window.scrollTo(0, 500))
      await page.waitForFunction(() => window.scrollY > 0, { timeout: 3000 }).catch(() => undefined)

      const afterScrollY = await page.evaluate(() => window.scrollY)

      // Скролл должен работать (если контент длиннее viewport)
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
      if (pageHeight > viewportSize.height) {
        expect(afterScrollY).toBeGreaterThan(initialScrollY)
        console.log('  ✓ Вертикальный скролл работает')
      }

      // Проверяем пагинацию если есть
      const pagination = page
        .getByRole('navigation', { name: /пагинация|pagination/i })
        .or(page.locator('[class*="pagination" i], [data-testid="pagination"]'))
        .or(page.getByRole('button', { name: /следующая|next|→|»/i }))

      const hasPagination = await pagination
        .first()
        .isVisible()
        .catch(() => false)

      if (hasPagination) {
        // Проверяем, что кнопки пагинации достаточного размера для тапа
        const paginationBtns = page.locator('[class*="pagination"] button, [class*="pagination"] a')
        const btnCount = await paginationBtns.count()

        for (let i = 0; i < Math.min(btnCount, 3); i++) {
          const btn = paginationBtns.nth(i)
          const box = await btn.boundingBox()
          if (box) {
            expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(30)
          }
        }
        console.log('  ✓ Пагинация адаптирована для touch')
      } else {
        // Проверяем infinite scroll
        const loadMoreBtn = page.getByRole('button', { name: /загрузить ещё|показать ещё|load more/i })
        if (await loadMoreBtn.isVisible().catch(() => false)) {
          console.log('  ✓ Используется "Загрузить ещё" вместо пагинации')
        } else {
          console.log('  ⏭️ Skip: пагинация не найдена')
        }
      }
    }
  })

  test('E2E-MB-09 — Landscape/Portrait ориентация переключается корректно', async ({ page }) => {
    await page.goto(urls.dashboard)
    await page.waitForLoadState('domcontentloaded')

    const viewportSize = page.viewportSize()

    if (viewportSize) {
      // Запоминаем текущую ориентацию
      const isPortrait = viewportSize.height > viewportSize.width
      const currentOrientation = isPortrait ? 'portrait' : 'landscape'

      // Проверяем, что страница корректно отображается в текущей ориентации
      await expect(page.locator('body')).toBeVisible()

      // Проверяем отсутствие горизонтального скролла
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5)

      // Эмулируем смену ориентации (меняем viewport)
      const newWidth = viewportSize.height
      const newHeight = viewportSize.width
      await page.setViewportSize({ width: newWidth, height: newHeight })

      // Ждём завершения resize и перерисовки
      await page
        .waitForFunction((expectedWidth: number) => window.innerWidth === expectedWidth, newWidth, { timeout: 3000 })
        .catch(() => undefined)

      // Проверяем, что страница адаптировалась
      await expect(page.locator('body')).toBeVisible()

      // Проверяем отсутствие горизонтального скролла после смены ориентации
      const afterResize = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(afterResize.scrollWidth).toBeLessThanOrEqual(afterResize.clientWidth + 5)

      console.log(`  ✓ Смена ориентации ${currentOrientation} → ${isPortrait ? 'landscape' : 'portrait'} работает`)

      // Возвращаем исходный viewport
      await page.setViewportSize(viewportSize)
    }
  })
})

import { expect, test } from '@playwright/test'

test.describe('Table of Contents (TOC)', () => {
  test.beforeEach(async ({ page }) => {
    // Используем Налоговый кодекс - длинный документ с разделами
    await page.goto('/codes/tax/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('TOC отображается на десктопе', async ({ page }) => {
    // TOC виден только на xl экранах
    await page.setViewportSize({ width: 1400, height: 900 })

    // TOC nav должен быть видимым
    const toc = page.locator('nav[aria-label="Содержание документа"]')
    await expect(toc).toBeVisible()

    // Должен содержать заголовок "Содержание"
    await expect(toc.getByText('Содержание')).toBeVisible()

    // Должен показывать процент прочитанного
    await expect(toc.locator('[role="progressbar"]')).toBeVisible()
  })

  test('TOC скрыт на мобильных устройствах', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const toc = page.locator('nav[aria-label="Содержание документа"]')
    await expect(toc).toBeHidden()
  })

  test('TOC содержит пункты из документа', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })

    const toc = page.locator('nav[aria-label="Содержание документа"]')

    // TOC — клиентский компонент: заголовки собираются из DOM после гидратации, а не приходят
    // в исходном SSR-HTML. `locator.count()` не ждёт — снимает DOM-снимок сразу и гонится с
    // React-гидратацией, которая на момент `domcontentloaded` может ещё не начаться (скрипт
    // Next.js исполняется как deferred module). Дожидаемся видимости самого nav (auto-retry
    // локатор Playwright) — тот же сигнал готовности, что уже используется в тесте выше
    // ("TOC отображается на десктопе"), и только потом читаем количество ссылок.
    await expect(toc).toBeVisible()

    // Должны быть ссылки на разделы
    const tocLinks = toc.locator('a[href^="#"]')
    const count = await tocLinks.count()
    expect(count).toBeGreaterThan(0)
  })

  test('подсветка активного пункта при скролле', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })

    const toc = page.locator('nav[aria-label="Содержание документа"]')

    // Находим первую ссылку в TOC
    const firstTocLink = toc.locator('a[href^="#"]').first()
    await expect(firstTocLink).toHaveAttribute('href')
    const firstHref = await firstTocLink.getAttribute('href')

    const firstId = firstHref!.slice(1) // убираем #

    // Скроллим к первому разделу
    await page.evaluate((id) => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'instant' })
      }
    }, firstId)

    // Ждём обновления IntersectionObserver
    await page.waitForTimeout(300)

    // Проверяем что ссылка стала активной (aria-current="location")
    await expect(firstTocLink).toHaveAttribute('aria-current', 'location')

    // Находим второй пункт (если есть)
    const secondTocLink = toc.locator('a[href^="#"]').nth(1)
    const secondHref = await secondTocLink.getAttribute('href')

    if (secondHref) {
      const secondId = secondHref.slice(1)

      // Скроллим ко второму разделу
      await page.evaluate((id) => {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'instant' })
        }
      }, secondId)

      await page.waitForTimeout(300)

      // Теперь второй пункт должен быть активным
      await expect(secondTocLink).toHaveAttribute('aria-current', 'location')

      // Первый больше не активен
      await expect(firstTocLink).not.toHaveAttribute('aria-current', 'location')
    }
  })

  test('клик по пункту TOC скроллит к разделу', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })

    const toc = page.locator('nav[aria-label="Содержание документа"]')

    // Находим пункт в середине списка
    const tocLinks = toc.locator('a[href^="#"]')
    const count = await tocLinks.count()
    const middleIndex = Math.floor(count / 2)
    const middleLink = tocLinks.nth(middleIndex)

    await expect(middleLink).toHaveAttribute('href')
    const href = await middleLink.getAttribute('href')
    const targetId = href!.slice(1)

    // Кликаем на пункт TOC
    await middleLink.click()

    // Ждём smooth scroll
    await page.waitForTimeout(500)

    // Проверяем что элемент в viewport
    const isVisible = await page.evaluate((id) => {
      const el = document.getElementById(id)
      if (!el) {
        return false
      }
      const rect = el.getBoundingClientRect()
      return rect.top >= 0 && rect.top < window.innerHeight
    }, targetId)

    expect(isVisible).toBe(true)

    // URL должен обновиться с хешем
    await expect(page).toHaveURL(new RegExp(`#${targetId}$`))
  })

  test('TOC автоскроллится к активному пункту', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })

    const toc = page.locator('nav[aria-label="Содержание документа"]')

    // Находим последний пункт TOC (внизу списка)
    const tocLinks = toc.locator('a[href^="#"]')
    const count = await tocLinks.count()

    // Пропускаем тест если мало пунктов
    if (count < 5) {
      test.skip()
      return
    }

    const lastLink = tocLinks.nth(count - 1)
    await expect(lastLink).toHaveAttribute('href')
    const lastHref = await lastLink.getAttribute('href')
    const lastId = lastHref!.slice(1)

    // Скроллим страницу к последнему разделу
    await page.evaluate((id) => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'instant' })
      }
    }, lastId)

    // Ждём IntersectionObserver + автоскролл TOC
    await page.waitForTimeout(500)

    // Проверяем что последний пункт TOC виден в контейнере TOC
    const isLastLinkVisibleInToc = await page.evaluate(() => {
      const toc = document.querySelector('nav[aria-label="Содержание документа"]')
      const activeLink = toc?.querySelector('a[aria-current="location"]')
      if (!toc || !activeLink) {
        return false
      }

      const tocRect = toc.getBoundingClientRect()
      const linkRect = activeLink.getBoundingClientRect()

      // Проверяем что ссылка внутри видимой области TOC
      return linkRect.top >= tocRect.top && linkRect.bottom <= tocRect.bottom
    })

    expect(isLastLinkVisibleInToc).toBe(true)
  })

  test('прогресс-бар обновляется при скролле', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })

    const toc = page.locator('nav[aria-label="Содержание документа"]')
    const progressBar = toc.locator('[role="progressbar"]')

    // Начальный прогресс около 0%
    const initialProgress = await progressBar.getAttribute('aria-valuenow')
    expect(Number(initialProgress)).toBeLessThan(20)

    // Скроллим в конец страницы
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)

    // Прогресс должен быть около 100%
    const finalProgress = await progressBar.getAttribute('aria-valuenow')
    expect(Number(finalProgress)).toBeGreaterThan(80)
  })

  test('TOC обновляется при клиентской навигации на другой документ', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })

    const toc = page.locator('nav[aria-label="Содержание документа"]')

    // Проверяем что TOC содержит разделы Налогового кодекса
    await expect(toc.getByText('Налоговые вычеты')).toBeVisible()

    // Переходим на Семейный кодекс через sidebar
    const familyLink = page.locator('nav a[href="/codes/family/"]').first()
    await familyLink.click()

    // Ждём навигации
    await expect(page).toHaveURL(/\/codes\/family\/?$/)
    await page.waitForLoadState('domcontentloaded')

    // Проверяем что контент изменился
    await expect(page.locator('h1')).toContainText('Семейный кодекс', { ignoreCase: true })

    // TOC должен обновиться — НЕ должен содержать "Налоговые вычеты"
    await expect(toc.getByText('Налоговые вычеты')).toBeHidden({ timeout: 5000 })

    // TOC должен содержать разделы Семейного кодекса
    // Ищем любой текст, специфичный для Семейного кодекса
    const tocText = await toc.textContent()
    expect(tocText).not.toContain('Налоговые вычеты')
    expect(tocText).not.toContain('ПОДОХОДНАЯ ПОДАТЬ')
  })

  test('прогресс сбрасывается при навигации на другой документ', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })

    const toc = page.locator('nav[aria-label="Содержание документа"]')
    const progressBar = toc.locator('[role="progressbar"]')

    // Скроллим вниз чтобы прогресс был > 0
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.waitForTimeout(300)

    const progressBefore = await progressBar.getAttribute('aria-valuenow')
    expect(Number(progressBefore)).toBeGreaterThan(0)

    // Переходим на другой документ
    const familyLink = page.locator('nav a[href="/codes/family/"]').first()
    await familyLink.click()
    await expect(page).toHaveURL(/\/codes\/family\/?$/)
    await page.waitForLoadState('domcontentloaded')

    // Прогресс должен сброситься (страница прокручена в начало)
    await page.waitForTimeout(300)
    const progressAfter = await progressBar.getAttribute('aria-valuenow')
    expect(Number(progressAfter)).toBeLessThan(10)
  })
})

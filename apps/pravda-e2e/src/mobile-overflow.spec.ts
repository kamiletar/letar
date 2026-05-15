import { expect, test } from '@playwright/test'

/**
 * E2E тесты для проверки горизонтальной прокрутки на мобильных устройствах.
 * Проверяет что таблицы и другие широкие элементы не вызывают overflow.
 *
 * Все 22 документа проверяются на отсутствие горизонтальной прокрутки
 * на мобильном viewport (375x667 — iPhone SE).
 */

/** Список всех документов для проверки */
const ALL_DOCUMENTS = [
  // Основные законы
  { path: '/constitution', name: 'Конституция' },
  { path: '/pravda', name: 'Русская Правда' },

  // Кодексы
  { path: '/codes/tax', name: 'Налоговый кодекс' },
  { path: '/codes/criminal', name: 'Уголовный кодекс' },
  { path: '/codes/family', name: 'Семейный кодекс' },
  { path: '/codes/labor', name: 'Трудовой кодекс' },
  { path: '/codes/digital', name: 'Цифровой кодекс' },
  { path: '/codes/medical', name: 'Медицинский кодекс' },
  { path: '/codes/ordeals', name: 'Кодекс ордалий' },
  { path: '/codes/criminal-procedure', name: 'УПК' },
  { path: '/codes/penal', name: 'УИК' },
  { path: '/codes/construction', name: 'Строительный кодекс' },
  { path: '/codes/state-secrets', name: 'Кодекс гос. тайн' },

  // Уставы
  { path: '/statutes/church', name: 'Церковный устав' },
  { path: '/statutes/trade', name: 'Торговый устав' },
  { path: '/statutes/military', name: 'Военный устав' },
  { path: '/statutes/education', name: 'Образовательный устав' },
  { path: '/statutes/road', name: 'Дорожный устав' },
  { path: '/statutes/postal', name: 'Почтовый устав' },
  { path: '/statutes/fair', name: 'Ярмарочный устав' },

  // Регламенты
  { path: '/regulations/duel', name: 'Дуэльный регламент' },
  { path: '/regulations/veche', name: 'Вечевой регламент' },
  { path: '/regulations/municipality', name: 'Муниципальный регламент' },
]

/** Мобильный viewport (iPhone SE) */
const MOBILE_VIEWPORT = { width: 375, height: 667 }

test.describe('Мобильный UI: горизонтальная прокрутка', () => {
  test.beforeEach(async ({ page }) => {
    // Устанавливаем мобильный viewport для всех тестов
    await page.setViewportSize(MOBILE_VIEWPORT)
  })

  /**
   * Проверяет что на странице нет горизонтальной прокрутки.
   * Горизонтальная прокрутка появляется когда scrollWidth > clientWidth.
   */
  async function checkNoHorizontalScroll(
    page: import('@playwright/test').Page,
    _docName: string
  ): Promise<{ hasOverflow: boolean; scrollWidth: number; clientWidth: number }> {
    const result = await page.evaluate(() => {
      const body = document.body
      const html = document.documentElement

      // Проверяем и body, и html на горизонтальный overflow
      const bodyOverflow = body.scrollWidth > body.clientWidth
      const htmlOverflow = html.scrollWidth > html.clientWidth

      return {
        hasOverflow: bodyOverflow || htmlOverflow,
        scrollWidth: Math.max(body.scrollWidth, html.scrollWidth),
        clientWidth: Math.min(body.clientWidth, html.clientWidth),
      }
    })

    return result
  }

  /**
   * Находит элементы, вызывающие overflow (для диагностики).
   */
  async function findOverflowingElements(page: import('@playwright/test').Page): Promise<string[]> {
    return page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth
      const overflowing: string[] = []

      // Проверяем все элементы
      document.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect()
        // Элемент выходит за правый край viewport
        if (rect.right > viewportWidth + 1) {
          const tag = el.tagName.toLowerCase()
          // className может быть SVGAnimatedString для SVG элементов
          const classNameStr =
            typeof el.className === 'string' ? el.className : el.className?.baseVal || el.getAttribute('class') || ''
          const classes = classNameStr ? `.${classNameStr.split(' ').filter(Boolean).join('.')}` : ''
          const id = el.id ? `#${el.id}` : ''
          overflowing.push(`${tag}${id}${classes} (right: ${Math.round(rect.right)}px)`)
        }
      })

      // Возвращаем уникальные элементы (первые 10)
      return [...new Set(overflowing)].slice(0, 10)
    })
  }

  // Генерируем тесты для каждого документа
  for (const doc of ALL_DOCUMENTS) {
    test(`${doc.name} — нет горизонтальной прокрутки`, async ({ page }) => {
      await page.goto(doc.path)
      await page.waitForLoadState('domcontentloaded')

      // Ждём загрузки контента
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

      // Прокручиваем страницу до конца чтобы загрузить весь контент
      await page.evaluate(async () => {
        const scrollStep = window.innerHeight
        let currentScroll = 0
        const maxScroll = document.body.scrollHeight

        while (currentScroll < maxScroll) {
          window.scrollTo(0, currentScroll)
          currentScroll += scrollStep
          // Небольшая задержка для рендеринга
          await new Promise((r) => setTimeout(r, 50))
        }

        // Возвращаемся наверх
        window.scrollTo(0, 0)
      })

      // Проверяем на горизонтальный overflow
      const { hasOverflow, scrollWidth, clientWidth } = await checkNoHorizontalScroll(page, doc.name)

      if (hasOverflow) {
        // Если есть overflow — находим проблемные элементы для отчёта
        const overflowingElements = await findOverflowingElements(page)

        // Делаем скриншот для отладки
        await page.screenshot({
          path: `test-results/overflow-${doc.path.replace(/\//g, '-')}.png`,
          fullPage: true,
        })

        // Формируем информативное сообщение об ошибке
        const errorMsg = [
          `Обнаружена горизонтальная прокрутка на странице "${doc.name}"`,
          `Viewport: ${MOBILE_VIEWPORT.width}px`,
          `ScrollWidth: ${scrollWidth}px (overflow: ${scrollWidth - clientWidth}px)`,
          overflowingElements.length > 0 ? `Проблемные элементы:\n  - ${overflowingElements.join('\n  - ')}` : '',
        ]
          .filter(Boolean)
          .join('\n')

        expect(hasOverflow, errorMsg).toBe(false)
      }

      expect(hasOverflow).toBe(false)
    })
  }

  test('Главная страница — нет горизонтальной прокрутки', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const { hasOverflow, scrollWidth, clientWidth } = await page.evaluate(() => {
      const body = document.body
      const html = document.documentElement

      return {
        hasOverflow: body.scrollWidth > body.clientWidth || html.scrollWidth > html.clientWidth,
        scrollWidth: Math.max(body.scrollWidth, html.scrollWidth),
        clientWidth: Math.min(body.clientWidth, html.clientWidth),
      }
    })

    if (hasOverflow) {
      await page.screenshot({
        path: 'test-results/overflow-home.png',
        fullPage: true,
      })
    }

    expect(hasOverflow, `Главная страница имеет горизонтальную прокрутку (${scrollWidth}px > ${clientWidth}px)`).toBe(
      false
    )
  })

  test('Страница поиска — нет горизонтальной прокрутки', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('domcontentloaded')

    // Выполняем поиск чтобы появились результаты
    const searchInput = page.locator('input[type="search"], input[placeholder*="Поиск"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('статья')
      // Ждём результатов поиска
      await page.waitForTimeout(500)
    }

    const { hasOverflow, scrollWidth, clientWidth } = await page.evaluate(() => {
      const body = document.body
      const html = document.documentElement

      return {
        hasOverflow: body.scrollWidth > body.clientWidth || html.scrollWidth > html.clientWidth,
        scrollWidth: Math.max(body.scrollWidth, html.scrollWidth),
        clientWidth: Math.min(body.clientWidth, html.clientWidth),
      }
    })

    if (hasOverflow) {
      await page.screenshot({
        path: 'test-results/overflow-search.png',
        fullPage: true,
      })
    }

    expect(hasOverflow, `Страница поиска имеет горизонтальную прокрутку (${scrollWidth}px > ${clientWidth}px)`).toBe(
      false
    )
  })

  test('Страница закладок — нет горизонтальной прокрутки', async ({ page }) => {
    await page.goto('/bookmarks')
    await page.waitForLoadState('domcontentloaded')

    const { hasOverflow, scrollWidth, clientWidth } = await page.evaluate(() => {
      const body = document.body
      const html = document.documentElement

      return {
        hasOverflow: body.scrollWidth > body.clientWidth || html.scrollWidth > html.clientWidth,
        scrollWidth: Math.max(body.scrollWidth, html.scrollWidth),
        clientWidth: Math.min(body.clientWidth, html.clientWidth),
      }
    })

    if (hasOverflow) {
      await page.screenshot({
        path: 'test-results/overflow-bookmarks.png',
        fullPage: true,
      })
    }

    expect(hasOverflow, `Страница закладок имеет горизонтальную прокрутку (${scrollWidth}px > ${clientWidth}px)`).toBe(
      false
    )
  })

  test('Страницы категорий — нет горизонтальной прокрутки', async ({ page }) => {
    const categoryPages = ['/codes', '/statutes', '/regulations']

    for (const categoryPath of categoryPages) {
      await page.goto(categoryPath)
      await page.waitForLoadState('domcontentloaded')

      const { hasOverflow, scrollWidth, clientWidth } = await page.evaluate(() => {
        const body = document.body
        const html = document.documentElement

        return {
          hasOverflow: body.scrollWidth > body.clientWidth || html.scrollWidth > html.clientWidth,
          scrollWidth: Math.max(body.scrollWidth, html.scrollWidth),
          clientWidth: Math.min(body.clientWidth, html.clientWidth),
        }
      })

      if (hasOverflow) {
        await page.screenshot({
          path: `test-results/overflow-category${categoryPath.replace(/\//g, '-')}.png`,
          fullPage: true,
        })
      }

      expect(
        hasOverflow,
        `Страница ${categoryPath} имеет горизонтальную прокрутку (${scrollWidth}px > ${clientWidth}px)`
      ).toBe(false)
    }
  })
})

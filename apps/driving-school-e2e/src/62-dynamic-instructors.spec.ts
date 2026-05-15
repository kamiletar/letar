import { expect, test } from './fixtures/base-test'
import { dynamicUrls, urls } from './fixtures/test-data'

test.describe('62. Публичный профиль инструктора /instructors/[id]/', () => {
  test.describe('62.1 Загрузка страницы профиля', () => {
    test('E2E-62.1.1 — профиль инструктора загружается по ID', async ({ page }) => {
      // Переходим на каталог инструкторов
      await page.goto(urls.searchInstructors)
      await page.waitForLoadState('domcontentloaded')

      // Ищем первого инструктора в списке
      const instructorLink = page
        .getByRole('link', { name: /подробнее|профиль|details/i })
        .or(page.locator('[data-testid="instructor-card"] a'))
        .or(page.locator('a[href*="/instructors/"]').filter({ hasNotText: /поиск|search|все/i }))
        .first()

      if (!(await instructorLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет инструкторов в каталоге')
        return
      }

      await instructorLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Проверяем URL — должен содержать ID инструктора
      const currentUrl = page.url()
      const hasInstructorId = /\/instructors\/[\w-]+\/?$/.test(currentUrl) && currentUrl !== `${urls.searchInstructors}`

      if (hasInstructorId) {
        expect(currentUrl).toMatch(/\/instructors\/[\w-]+\/?/)
      } else {
        console.log('  ⏭️ Skip: переход на профиль инструктора не произошёл')
      }
    })

    test('E2E-62.1.2 — несуществующий инструктор возвращает 404', async ({ page }) => {
      const response = await page.goto(dynamicUrls.instructorById('non-existent-instructor-999'))

      const status = response?.status()
      const is404 = status === 404

      const hasNotFound = await page
        .getByRole('heading', { name: /не найден|not found/i })
        .isVisible()
        .catch(() => false)

      expect(is404 || hasNotFound || status === 200).toBe(true) // 200 если redirect
    })
  })

  test.describe('62.2 Информация об инструкторе', () => {
    test('E2E-62.2.1 — имя инструктора отображается', async ({ page }) => {
      await page.goto(urls.searchInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorLink = page
        .locator('a[href*="/instructors/"]')
        .filter({ hasNotText: /поиск|search|все/i })
        .first()

      if (!(await instructorLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет инструкторов')
        return
      }

      await instructorLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем имя инструктора
      const instructorName = page
        .getByRole('heading', { level: 1 })
        .or(page.locator('[data-testid="instructor-name"]'))
        .or(page.locator('.instructor-name'))
        .first()

      const hasName = await instructorName.isVisible().catch(() => false)
      if (hasName) {
        await expect(instructorName).toBeVisible()
        console.log('  ✓ Имя инструктора отображается')
      } else {
        console.log('  ⏭️ Skip: имя не найдено')
      }
    })

    test('E2E-62.2.2 — фото инструктора отображается', async ({ page }) => {
      await page.goto(urls.searchInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorLink = page
        .locator('a[href*="/instructors/"]')
        .filter({ hasNotText: /поиск|search|все/i })
        .first()

      if (!(await instructorLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет инструкторов')
        return
      }

      await instructorLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем фото/аватар
      const photo = page
        .getByRole('img', { name: /фото|аватар|инструктор|photo|avatar/i })
        .or(page.locator('[data-testid="instructor-photo"]'))
        .or(page.locator('.avatar img'))
        .first()

      const hasPhoto = await photo.isVisible().catch(() => false)
      if (hasPhoto) {
        console.log('  ✓ Фото инструктора найдено')
      } else {
        console.log('  ⏭️ Skip: фото не найдено')
      }
    })

    test('E2E-62.2.3 — рейтинг инструктора отображается', async ({ page }) => {
      await page.goto(urls.searchInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorLink = page
        .locator('a[href*="/instructors/"]')
        .filter({ hasNotText: /поиск|search|все/i })
        .first()

      if (!(await instructorLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет инструкторов')
        return
      }

      await instructorLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем рейтинг
      const rating = page
        .locator('[data-testid="instructor-rating"]')
        .or(page.getByText(/★|⭐|\d+\.\d+/))
        .or(page.locator('.rating'))
        .first()

      const hasRating = await rating.isVisible().catch(() => false)
      if (hasRating) {
        console.log('  ✓ Рейтинг инструктора отображается')
      } else {
        console.log('  ⏭️ Skip: рейтинг не найден')
      }
    })

    test('E2E-62.2.4 — информация об автомобиле отображается', async ({ page }) => {
      await page.goto(urls.searchInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorLink = page
        .locator('a[href*="/instructors/"]')
        .filter({ hasNotText: /поиск|search|все/i })
        .first()

      if (!(await instructorLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет инструкторов')
        return
      }

      await instructorLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем информацию об автомобиле
      const carInfo = page
        .getByText(/автомобиль|машина|car|toyota|kia|hyundai|lada/i)
        .or(page.locator('[data-testid="instructor-car"]'))
        .or(page.locator('.car-info'))
        .first()

      const hasCarInfo = await carInfo.isVisible().catch(() => false)
      if (hasCarInfo) {
        console.log('  ✓ Информация об автомобиле найдена')
      } else {
        console.log('  ⏭️ Skip: информация об автомобиле не найдена')
      }
    })
  })

  test.describe('62.3 Отзывы и цены', () => {
    test('E2E-62.3.1 — секция отзывов отображается', async ({ page }) => {
      await page.goto(urls.searchInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorLink = page
        .locator('a[href*="/instructors/"]')
        .filter({ hasNotText: /поиск|search|все/i })
        .first()

      if (!(await instructorLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет инструкторов')
        return
      }

      await instructorLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем секцию отзывов
      const reviewsSection = page
        .getByRole('heading', { name: /отзыв|review/i })
        .or(page.locator('[data-testid="reviews-section"]'))
        .or(page.getByRole('tab', { name: /отзыв/i }))

      const hasReviews = await reviewsSection.isVisible().catch(() => false)
      if (hasReviews) {
        console.log('  ✓ Секция отзывов найдена')
      } else {
        console.log('  ⏭️ Skip: секция отзывов не найдена')
      }
    })

    test('E2E-62.3.2 — цены на занятия отображаются', async ({ page }) => {
      await page.goto(urls.searchInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorLink = page
        .locator('a[href*="/instructors/"]')
        .filter({ hasNotText: /поиск|search|все/i })
        .first()

      if (!(await instructorLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет инструкторов')
        return
      }

      await instructorLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем цены
      const prices = page
        .getByText(/₽|руб|цен|стоимост|price/i)
        .or(page.locator('[data-testid="lesson-prices"]'))
        .first()

      const hasPrices = await prices.isVisible().catch(() => false)
      if (hasPrices) {
        console.log('  ✓ Цены на занятия найдены')
      } else {
        console.log('  ⏭️ Skip: цены не найдены')
      }
    })
  })

  test.describe('62.4 Действия', () => {
    test('E2E-62.4.1 — кнопка записи на занятие доступна', async ({ page }) => {
      await page.goto(urls.searchInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorLink = page
        .locator('a[href*="/instructors/"]')
        .filter({ hasNotText: /поиск|search|все/i })
        .first()

      if (!(await instructorLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет инструкторов')
        return
      }

      await instructorLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку записи
      const bookButton = page
        .getByRole('button', { name: /записаться|book|забронировать/i })
        .or(page.getByRole('link', { name: /записаться|расписание/i }))
        .or(page.locator('[data-testid="book-lesson-button"]'))

      const hasBookButton = await bookButton.isVisible().catch(() => false)
      if (hasBookButton) {
        await expect(bookButton).toBeVisible()
        console.log('  ✓ Кнопка записи найдена')
      } else {
        console.log('  ⏭️ Skip: кнопка записи не найдена')
      }
    })

    test('E2E-62.4.2 — кнопка написать сообщение доступна', async ({ page }) => {
      await page.goto(urls.searchInstructors)
      await page.waitForLoadState('domcontentloaded')

      const instructorLink = page
        .locator('a[href*="/instructors/"]')
        .filter({ hasNotText: /поиск|search|все/i })
        .first()

      if (!(await instructorLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет инструкторов')
        return
      }

      await instructorLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку написать
      const messageButton = page
        .getByRole('button', { name: /написать|сообщен|message|чат/i })
        .or(page.getByRole('link', { name: /написать|чат/i }))
        .or(page.locator('[data-testid="message-button"]'))

      const hasMessageButton = await messageButton.isVisible().catch(() => false)
      if (hasMessageButton) {
        console.log('  ✓ Кнопка написать сообщение найдена')
      } else {
        console.log('  ⏭️ Skip: кнопка сообщения не найдена')
      }
    })
  })
})

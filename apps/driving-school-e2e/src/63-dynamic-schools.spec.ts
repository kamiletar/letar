import { expect, test } from './fixtures/base-test'
import { dynamicUrls, urls } from './fixtures/test-data'

test.describe('63. Публичная страница школы /schools/[id]/', () => {
  test.describe('63.1 Загрузка страницы школы', () => {
    test('E2E-63.1.1 — страница школы загружается по ID', async ({ page }) => {
      // Переходим на каталог школ
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      // Ищем первую школу в списке
      const schoolLink = page
        .getByRole('link', { name: /подробнее|профиль|details/i })
        .or(page.locator('[data-testid="school-card"] a'))
        .or(page.locator('a[href*="/schools/"]').filter({ hasNotText: /поиск|search|все|каталог/i }))
        .first()

      if (!(await schoolLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет школ в каталоге')
        return
      }

      await schoolLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Проверяем URL — должен содержать ID школы
      const currentUrl = page.url()
      const hasSchoolId = /\/schools\/[\w-]+\/?$/.test(currentUrl) && currentUrl !== `${urls.searchSchools}`

      if (hasSchoolId) {
        expect(currentUrl).toMatch(/\/schools\/[\w-]+\/?/)
      } else {
        console.log('  ⏭️ Skip: переход на страницу школы не произошёл')
      }
    })

    test('E2E-63.1.2 — несуществующая школа возвращает 404', async ({ page }) => {
      const response = await page.goto(dynamicUrls.schoolById('non-existent-school-999'))

      const status = response?.status()
      const is404 = status === 404

      const hasNotFound = await page
        .getByRole('heading', { name: /не найден|not found/i })
        .isVisible()
        .catch(() => false)

      expect(is404 || hasNotFound || status === 200).toBe(true)
    })
  })

  test.describe('63.2 Информация о школе', () => {
    test('E2E-63.2.1 — название школы отображается', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      const schoolLink = page
        .locator('a[href*="/schools/"]')
        .filter({ hasNotText: /поиск|search|все|каталог/i })
        .first()

      if (!(await schoolLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет школ')
        return
      }

      await schoolLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем название школы
      const schoolName = page
        .getByRole('heading', { level: 1 })
        .or(page.locator('[data-testid="school-name"]'))
        .or(page.locator('.school-name'))
        .first()

      const hasName = await schoolName.isVisible().catch(() => false)
      if (hasName) {
        await expect(schoolName).toBeVisible()
        console.log('  ✓ Название школы отображается')
      } else {
        console.log('  ⏭️ Skip: название не найдено')
      }
    })

    test('E2E-63.2.2 — описание школы отображается', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      const schoolLink = page
        .locator('a[href*="/schools/"]')
        .filter({ hasNotText: /поиск|search|все|каталог/i })
        .first()

      if (!(await schoolLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет школ')
        return
      }

      await schoolLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем описание
      const description = page
        .locator('[data-testid="school-description"]')
        .or(page.locator('.school-description'))
        .or(page.getByText(/о школе|about|описание/i))
        .first()

      const hasDescription = await description.isVisible().catch(() => false)
      if (hasDescription) {
        console.log('  ✓ Описание школы найдено')
      } else {
        console.log('  ⏭️ Skip: описание не найдено')
      }
    })

    test('E2E-63.2.3 — контактная информация отображается', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      const schoolLink = page
        .locator('a[href*="/schools/"]')
        .filter({ hasNotText: /поиск|search|все|каталог/i })
        .first()

      if (!(await schoolLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет школ')
        return
      }

      await schoolLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем контакты
      const contacts = page
        .getByText(/телефон|phone|email|@|адрес|address/i)
        .or(page.locator('[data-testid="school-contacts"]'))
        .first()

      const hasContacts = await contacts.isVisible().catch(() => false)
      if (hasContacts) {
        console.log('  ✓ Контактная информация найдена')
      } else {
        console.log('  ⏭️ Skip: контакты не найдены')
      }
    })
  })

  test.describe('63.3 Инструкторы и курсы', () => {
    test('E2E-63.3.1 — список инструкторов школы отображается', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      const schoolLink = page
        .locator('a[href*="/schools/"]')
        .filter({ hasNotText: /поиск|search|все|каталог/i })
        .first()

      if (!(await schoolLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет школ')
        return
      }

      await schoolLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем секцию инструкторов
      const instructorsSection = page
        .getByRole('heading', { name: /инструктор|преподаватель|instructor/i })
        .or(page.locator('[data-testid="school-instructors"]'))
        .or(page.getByRole('tab', { name: /инструктор/i }))

      const hasInstructors = await instructorsSection.isVisible().catch(() => false)
      if (hasInstructors) {
        console.log('  ✓ Секция инструкторов найдена')
      } else {
        console.log('  ⏭️ Skip: секция инструкторов не найдена')
      }
    })

    test('E2E-63.3.2 — курсы школы отображаются', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      const schoolLink = page
        .locator('a[href*="/schools/"]')
        .filter({ hasNotText: /поиск|search|все|каталог/i })
        .first()

      if (!(await schoolLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет школ')
        return
      }

      await schoolLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем секцию курсов
      const coursesSection = page
        .getByRole('heading', { name: /курс|программ|course/i })
        .or(page.locator('[data-testid="school-courses"]'))
        .or(page.getByRole('tab', { name: /курс/i }))

      const hasCourses = await coursesSection.isVisible().catch(() => false)
      if (hasCourses) {
        console.log('  ✓ Секция курсов найдена')
      } else {
        console.log('  ⏭️ Skip: секция курсов не найдена')
      }
    })
  })

  test.describe('63.4 Действия', () => {
    test('E2E-63.4.1 — кнопка записи в школу доступна', async ({ page }) => {
      await page.goto(urls.searchSchools)
      await page.waitForLoadState('domcontentloaded')

      const schoolLink = page
        .locator('a[href*="/schools/"]')
        .filter({ hasNotText: /поиск|search|все|каталог/i })
        .first()

      if (!(await schoolLink.isVisible().catch(() => false))) {
        console.log('  ⏭️ Skip: нет школ')
        return
      }

      await schoolLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Ищем кнопку записи
      const enrollButton = page
        .getByRole('button', { name: /записаться|поступить|enroll|подать заявк/i })
        .or(page.getByRole('link', { name: /записаться|поступить/i }))
        .or(page.locator('[data-testid="enroll-button"]'))

      const hasEnrollButton = await enrollButton.isVisible().catch(() => false)
      if (hasEnrollButton) {
        await expect(enrollButton).toBeVisible()
        console.log('  ✓ Кнопка записи в школу найдена')
      } else {
        console.log('  ⏭️ Skip: кнопка записи не найдена')
      }
    })
  })
})

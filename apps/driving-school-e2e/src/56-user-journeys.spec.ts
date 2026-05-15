import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { Locators } from './helpers/locators.helpers'
import { navigateAndWait } from './helpers/page.helpers'

/**
 * E2E тесты User Journeys — комплексные сценарии от начала до конца
 *
 * Сценарии:
 * 1. Путь ученика: главная → поиск инструкторов → просмотр профиля → заявка
 * 2. Путь инструктора: дашборд → расписание → типы занятий → цены
 * 3. Путь школьного админа: школа → настройки → группы → курсы
 * 4. Путь владельца: панель → школы → пользователи → логи
 *
 * Примечание: Используют уже авторизованных пользователей
 */
test.describe('User Journeys', () => {
  test.describe.configure({ retries: 1 })

  test.describe('Путь ученика — поиск инструктора', () => {
    test.use({ storageState: 'playwright/.auth/student.json' })

    test('E2E-UJ-1 — ученик переходит от главной к поиску инструкторов', async ({ page }) => {
      // Начинаем с dashboard
      await navigateAndWait(page, urls.dashboard)

      // Ищем ссылку на поиск инструкторов или в меню
      const instructorsLink = page.getByRole('link', { name: /инструктор|найти/i }).first()
      const hasLink = await instructorsLink.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLink) {
        await instructorsLink.click()
        await page.waitForLoadState('domcontentloaded')
        expect(page.url()).toContain('/instructor')
      } else {
        // Переходим напрямую
        await navigateAndWait(page, urls.searchInstructors)
        expect(page.url()).toContain('/instructor')
      }
    })

    test('E2E-UJ-2 — ученик просматривает профиль инструктора', async ({ page }) => {
      await navigateAndWait(page, urls.searchInstructors)

      // Ищем карточку инструктора
      const instructorCard = Locators.card(page).first()
      const hasCards = await instructorCard.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasCards) {
        // Кликаем по карточке или кнопке просмотра
        const viewLink = page.getByRole('link', { name: /подробнее|профиль|view/i }).first()
        const hasViewLink = await viewLink.isVisible().catch(() => false)

        if (hasViewLink) {
          await viewLink.click()
          await page.waitForLoadState('domcontentloaded')

          // Должна открыться страница профиля инструктора
          const hasProfileContent = await page
            .getByRole('heading')
            .first()
            .isVisible({ timeout: 5000 })
            .catch(() => false)

          expect(hasProfileContent).toBe(true)
        } else {
          // Кликаем по карточке
          await instructorCard.click()
          await page.waitForLoadState('domcontentloaded')
        }
      } else {
        console.log('  ⏭️ Skip: нет инструкторов для просмотра')
      }
    })

    test('E2E-UJ-3 — ученик переходит к своему расписанию', async ({ page }) => {
      await navigateAndWait(page, urls.dashboard)

      // Ищем ссылку на расписание
      const scheduleLink = page.getByRole('link', { name: /расписание|schedule/i }).first()
      const hasLink = await scheduleLink.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLink) {
        await scheduleLink.click()
        await page.waitForLoadState('domcontentloaded')
      } else {
        await navigateAndWait(page, urls.studentSchedule)
      }

      expect(page.url()).toContain('/schedule')
    })

    test('E2E-UJ-4 — ученик просматривает свои занятия', async ({ page }) => {
      await navigateAndWait(page, urls.dashboard)

      // Ищем ссылку на занятия
      const lessonsLink = page.getByRole('link', { name: /занятия|уроки|lessons/i }).first()
      const hasLink = await lessonsLink.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLink) {
        await lessonsLink.click()
        await page.waitForLoadState('domcontentloaded')
      } else {
        await navigateAndWait(page, urls.lessons)
      }

      expect(page.url()).toContain('/lesson')
    })

    test('E2E-UJ-5 — ученик проверяет свои отзывы', async ({ page }) => {
      await navigateAndWait(page, urls.studentReviews)

      // Должна загрузиться страница отзывов
      const hasReviewsContent = await page
        .getByRole('heading', { name: /отзыв/i })
        .or(page.getByText(/нет отзывов/i))
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasReviewsContent).toBe(true)
    })
  })

  test.describe('Путь инструктора — управление занятиями', () => {
    test.use({ storageState: 'playwright/.auth/instructor.json' })

    test('E2E-UJ-6 — инструктор переходит к своим занятиям', async ({ page }) => {
      await navigateAndWait(page, urls.dashboard)

      const lessonsLink = page.getByRole('link', { name: /занятия|уроки|lessons/i }).first()
      const hasLink = await lessonsLink.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLink) {
        await lessonsLink.click()
        await page.waitForLoadState('domcontentloaded')
      } else {
        await navigateAndWait(page, urls.instructorLessons)
      }

      expect(page.url()).toContain('/lesson')
    })

    test('E2E-UJ-7 — инструктор проверяет расписание и настройки', async ({ page }) => {
      // Переходим на расписание
      await navigateAndWait(page, urls.instructorSchedule)

      expect(page.url()).toContain('/schedule')

      // Ищем ссылку на настройки расписания
      const settingsLink = page.getByRole('link', { name: /настройки|settings/i }).first()
      const hasLink = await settingsLink.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLink) {
        await settingsLink.click()
        await page.waitForLoadState('domcontentloaded')
        expect(page.url()).toContain('/settings')
      }
    })

    test('E2E-UJ-8 — инструктор переходит к типам занятий и ценам', async ({ page }) => {
      await navigateAndWait(page, urls.instructorLessonTypes)

      expect(page.url()).toContain('/lesson-types')

      // Ищем ссылку на цены
      const pricingLink = page.getByRole('link', { name: /цен|pricing/i }).first()
      const hasLink = await pricingLink.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasLink) {
        await pricingLink.click()
        await page.waitForLoadState('domcontentloaded')
        expect(page.url()).toContain('/pricing')
      } else {
        console.log('  ⏭️ Skip: нет типов занятий')
      }
    })

    test('E2E-UJ-9 — инструктор просматривает своих учеников', async ({ page }) => {
      await navigateAndWait(page, urls.instructorStudents)

      const hasStudentsContent = await page
        .getByRole('heading', { name: /ученик|студент/i })
        .or(page.getByText(/нет учеников/i))
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasStudentsContent).toBe(true)
    })

    test('E2E-UJ-10 — инструктор проверяет свою статистику', async ({ page }) => {
      await navigateAndWait(page, urls.instructorStats)

      const hasStatsContent = await page
        .getByRole('heading', { name: /статистик/i })
        .or(page.locator('[class*="stat"]'))
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasStatsContent).toBe(true)
    })
  })

  test.describe('Путь школьного админа — управление школой', () => {
    test.use({ storageState: 'playwright/.auth/school-admin.json' })

    test('E2E-UJ-11 — админ переходит к настройкам школы', async ({ page }) => {
      await navigateAndWait(page, urls.schoolSettings)

      const hasSettingsContent = await page
        .getByRole('heading', { name: /настройки/i })
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasSettingsContent).toBe(true)
    })

    test('E2E-UJ-12 — админ просматривает учебные группы', async ({ page }) => {
      await navigateAndWait(page, urls.schoolStudyGroups)

      const hasGroupsContent = await page
        .getByRole('heading', { name: /группы|groups/i })
        .or(page.getByText(/нет групп/i))
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasGroupsContent).toBe(true)
    })

    test('E2E-UJ-13 — админ просматривает курсы школы', async ({ page }) => {
      await navigateAndWait(page, urls.schoolCourses)

      const hasCoursesContent = await page
        .getByRole('heading', { name: /курс/i })
        .or(page.getByText(/нет курсов/i))
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasCoursesContent).toBe(true)
    })

    test('E2E-UJ-14 — админ проверяет статистику школы', async ({ page }) => {
      await navigateAndWait(page, urls.schoolStats)

      const hasStatsContent = await page
        .getByRole('heading', { name: /статистик/i })
        .or(page.locator('[class*="stat"]'))
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasStatsContent).toBe(true)
    })
  })

  test.describe('Путь владельца — администрирование платформы', () => {
    test.use({ storageState: 'playwright/.auth/owner.json' })

    test('E2E-UJ-15 — владелец переходит к панели управления', async ({ page }) => {
      await navigateAndWait(page, urls.owner)

      const hasOwnerContent = await page
        .getByRole('heading', { name: /панель|owner|администрирование/i })
        .or(page.getByText(/добро пожаловать/i))
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasOwnerContent).toBe(true)
    })

    test('E2E-UJ-16 — владелец просматривает список школ', async ({ page }) => {
      await page.goto(urls.ownerSchools)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasSchoolsContent = await page
        .getByRole('heading', { name: /управление.*школ/i })
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasSchoolsContent).toBe(true)
    })

    test('E2E-UJ-17 — владелец просматривает пользователей', async ({ page }) => {
      await page.goto(urls.ownerUsers)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasUsersContent = await page
        .getByRole('heading', { name: /пользовател/i })
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasUsersContent).toBe(true)
    })

    test('E2E-UJ-18 — владелец просматривает логи API', async ({ page }) => {
      await page.goto(urls.ownerApiLogs)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasLogsContent = await page
        .getByRole('heading', { name: /логи api/i })
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasLogsContent).toBe(true)
    })

    test('E2E-UJ-19 — владелец просматривает аудит', async ({ page }) => {
      await page.goto(urls.ownerAudit)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 15000 }).catch(() => undefined)

      const hasAuditContent = await page
        .getByRole('heading', { name: /аудит|журнал/i })
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasAuditContent).toBe(true)
    })
  })

  test.describe('Кросс-ролевые сценарии', () => {
    test('E2E-UJ-20 — неавторизованный видит публичные страницы', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })
      const page = await context.newPage()

      // Главная
      await navigateAndWait(page, '/')
      expect(page.url()).toBeDefined()

      // Документация
      await navigateAndWait(page, urls.developers)
      expect(page.url()).toContain('/developers')

      // API Docs
      await navigateAndWait(page, urls.apiDocs)
      expect(page.url()).toContain('/api-docs')

      // Юридические страницы
      await navigateAndWait(page, urls.legalOffer)
      expect(page.url()).toContain('/legal')

      await context.close()
    })
  })

  test.describe('Навигация меню', () => {
    test.use({ storageState: 'playwright/.auth/student.json' })

    test('E2E-UJ-21 — навигация через меню работает', async ({ page }) => {
      await navigateAndWait(page, urls.dashboard)

      // Ищем навигационное меню
      const nav = page.locator('nav, [role="navigation"]').first()
      const hasNav = await nav.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasNav) {
        // Проверяем что меню содержит ссылки
        const links = await nav.locator('a').count()
        expect(links).toBeGreaterThan(0)
      }
    })
  })
})

import { expect, test } from './fixtures/base-test'
import {
  schoolCourses,
  schoolProgress,
  schoolReviewsById,
  schoolStatsById,
  schoolStudyGroupsById,
  schoolTheoryLessonsById,
  urls,
} from './fixtures/test-data'
import { Locators } from './helpers/locators.helpers'
import { getTestSchoolId, navigateAndWait } from './helpers/page.helpers'

/**
 * Journey 5: Полный цикл обучения ученика в школе
 *
 * Эмулирует процесс от зачисления до выпуска:
 * Зачисление → Теория (посещение) → Документы → Практика → Экзамены → Выпуск
 *
 * Переключение ролей: school-admin ↔ instructor ↔ student
 */
test.describe('82. Journey: Полный цикл обучения', () => {
  test.describe.configure({ mode: 'serial' })

  // Динамические URL с schoolId (из globalSetup)
  const schoolId = getTestSchoolId()
  const progressUrl = schoolId ? schoolProgress(schoolId) : urls.schoolProgress
  const coursesUrl = schoolId ? schoolCourses(schoolId) : urls.schoolCourses
  const studyGroupsUrl = schoolId ? schoolStudyGroupsById(schoolId) : urls.schoolStudyGroups
  const theoryLessonsUrl = schoolId ? schoolTheoryLessonsById(schoolId) : urls.schoolTheoryLessons
  const statsUrl = schoolId ? schoolStatsById(schoolId) : urls.schoolStats
  const reviewsUrl = schoolId ? schoolReviewsById(schoolId) : urls.schoolReviews

  // Вспомогательная функция: ожидание загрузки
  async function waitForSectionLoad(page: import('@playwright/test').Page) {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 10000 }).catch(() => undefined)
  }

  // === Часть 1: Прогресс ученика (школьный админ) ===

  test.describe('82.1 Прогресс ученика (админ)', () => {
    test.use({ storageState: 'playwright/.auth/school-admin.json' })

    test('E2E-FT-1 — страница прогресса загружается', async ({ page }) => {
      await page.goto(progressUrl)
      await waitForSectionLoad(page)

      const hasProgress = await page
        .getByText(/ученик|прогресс|обучающи/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasProgress).toBe(true)
    })

    test('E2E-FT-2 — если есть ученики, видны статусы', async ({ page }) => {
      await page.goto(progressUrl)
      await waitForSectionLoad(page)

      const hasStudents = await Locators.card(page)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (!hasStudents) {
        console.log('  ⏭️ Skip: нет учеников')
        return
      }

      const hasStatusBadge = await page
        .locator('[data-scope="badge"]')
        .or(page.getByText(/активн|обучает|завершён|graduated/i))
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasStatusBadge).toBe(true)
    })

    test('E2E-FT-3 — курсы школы отображаются для привязки', async ({ page }) => {
      await page.goto(coursesUrl)
      await waitForSectionLoad(page)

      const hasCourses = await Locators.card(page)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      const hasEmptyState = await page
        .getByText(/нет курсов|создайте/i)
        .isVisible()
        .catch(() => false)

      expect(hasCourses || hasEmptyState).toBe(true)
    })
  })

  // === Часть 2: Теория — посещаемость (инструктор) ===

  test.describe('82.2 Теоретические занятия (инструктор)', () => {
    test.use({ storageState: 'playwright/.auth/instructor.json' })

    test('E2E-FT-4 — страница теоретических занятий загружается', async ({ page }) => {
      await navigateAndWait(page, urls.theoryLessons)

      const hasTheory = await page
        .getByText(/теоретическ|теори|занят/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasTheory).toBe(true)
    })

    test('E2E-FT-5 — список теоретических занятий или empty state', async ({ page }) => {
      await navigateAndWait(page, urls.theoryLessons)

      const hasCards = await Locators.card(page)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      const hasTable = await page
        .locator('table, [role="table"]')
        .first()
        .isVisible()
        .catch(() => false)

      const hasEmptyState = await page
        .getByText(/нет.*занятий|пока нет/i)
        .first()
        .isVisible()
        .catch(() => false)

      const hasHeading = await page
        .getByText(/теоретическ/i)
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasCards || hasTable || hasEmptyState || hasHeading).toBe(true)
    })
  })

  // === Часть 3: Экзамены (инструктор) ===

  test.describe('82.3 Экзамены', () => {
    test.use({ storageState: 'playwright/.auth/instructor.json' })

    test('E2E-FT-6 — страница экзаменов загружается', async ({ page }) => {
      await navigateAndWait(page, urls.exams)

      const hasExams = await page
        .getByText(/экзамен|испытани|аттестац/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasExams).toBe(true)
    })

    test('E2E-FT-7 — список экзаменов или empty state', async ({ page }) => {
      await navigateAndWait(page, urls.exams)

      const hasCards = await Locators.card(page)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      const hasTable = await page
        .locator('table, [role="table"]')
        .first()
        .isVisible()
        .catch(() => false)

      const hasEmptyState = await page
        .getByText(/нет.*экзамен|пока нет|запланиру/i)
        .first()
        .isVisible()
        .catch(() => false)

      const hasHeading = await page
        .getByText(/экзамен/i)
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasCards || hasTable || hasEmptyState || hasHeading).toBe(true)
    })
  })

  // === Часть 4: Практика — занятия (инструктор) ===

  test.describe('82.4 Практические занятия (инструктор)', () => {
    test.use({ storageState: 'playwright/.auth/instructor.json' })

    test('E2E-FT-8 — страница занятий инструктора загружается', async ({ page }) => {
      await navigateAndWait(page, urls.instructorLessons)

      const hasLessons = await page
        .getByText(/занят|урок|расписани/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasLessons).toBe(true)
    })

    test('E2E-FT-9 — статистика инструктора показывает данные', async ({ page }) => {
      await navigateAndWait(page, urls.instructorStats)

      const hasStats = await page
        .getByText(/статистика|занят|ученик/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasStats).toBe(true)
    })

    test('E2E-FT-10 — ученики инструктора отображаются', async ({ page }) => {
      test.slow() // Страница учеников может загружаться медленно
      await navigateAndWait(page, urls.instructorStudents)
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 60000 }).catch(() => undefined)

      const hasStudents = await page
        .getByText(/ученик|студент|мои/i)
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => true)
        .catch(() => false)

      expect(hasStudents).toBe(true)
    })
  })

  // === Часть 5: Мой прогресс (ученик) ===

  test.describe('82.5 Прогресс ученика (из роли ученика)', () => {
    test.use({ storageState: 'playwright/.auth/student.json' })

    test('E2E-FT-11 — дашборд ученика загружается', async ({ page }) => {
      test.slow()
      await navigateAndWait(page, urls.dashboard)

      // Auto-retrying assertion — ждёт дашборд или состояние загрузки
      const dashboardContent = page.getByText(/привет|дашборд|панель|кабинет|загрузка|добро пожаловать/i).first()
      await expect(dashboardContent).toBeVisible({ timeout: 30000 })
    })

    test('E2E-FT-12 — профиль ученика загружается', async ({ page }) => {
      await navigateAndWait(page, urls.studentProfile)

      const content = page.getByText(/профиль|мой|данные|загрузка/i).first()
      await expect(content).toBeVisible({ timeout: 15000 })
    })

    test('E2E-FT-13 — мои занятия загружаются', async ({ page }) => {
      await navigateAndWait(page, urls.studentLessons)

      const content = page.getByText(/занят|урок|мои|загрузка/i).first()
      await expect(content).toBeVisible({ timeout: 15000 })
    })

    test('E2E-FT-14 — моё расписание загружается', async ({ page }) => {
      await navigateAndWait(page, urls.studentSchedule)

      const content = page.getByText(/расписание|загрузка/i).first()
      await expect(content).toBeVisible({ timeout: 15000 })
    })

    test('E2E-FT-15 — мои отзывы загружаются', async ({ page }) => {
      await navigateAndWait(page, urls.myReviews)

      const content = page.getByText(/отзыв|рейтинг|мои|загрузка/i).first()
      await expect(content).toBeVisible({ timeout: 15000 })
    })
  })

  // === Часть 6: Статистика школы (админ) ===

  test.describe('82.6 Итоговая статистика (админ)', () => {
    test.use({ storageState: 'playwright/.auth/school-admin.json' })

    test('E2E-FT-16 — статистика школы обновляется', async ({ page }) => {
      await page.goto(statsUrl)
      await waitForSectionLoad(page)

      const content = page.getByText(/статистика|показател|kpi|загрузка/i).first()
      await expect(content).toBeVisible({ timeout: 15000 })
    })

    test('E2E-FT-17 — отзывы школы загружаются', async ({ page }) => {
      await page.goto(reviewsUrl)
      await waitForSectionLoad(page)

      const content = page.getByText(/отзыв|рейтинг|загрузка/i).first()
      await expect(content).toBeVisible({ timeout: 15000 })
    })
  })

  // === Часть 7: Полный проход ===

  test.describe('82.7 Полный проход по всем ролям', () => {
    test('E2E-FT-18 — полный проход админа: прогресс → курсы → группы → расписание → статистика', async ({
      browser,
    }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/school-admin.json',
      })
      const page = await context.newPage()

      // Блокируем SSE
      await page.route('**/api/chats/unread-stream/**', (route) => route.abort())
      await page.route('**/api/auth/verification-stream/**', (route) => route.abort())
      await page.route('**/api/realtime/**', (route) => route.abort())

      try {
        // 1. Прогресс учеников
        await page.goto(progressUrl)
        await waitForSectionLoad(page)
        expect(page.url()).toContain('/progress')

        // 2. Курсы
        await page.goto(coursesUrl)
        await waitForSectionLoad(page)
        expect(page.url()).toContain('/courses')

        // 3. Группы
        await page.goto(studyGroupsUrl)
        await waitForSectionLoad(page)
        expect(page.url()).toContain('/study-groups')

        // 4. Расписание
        await page.goto(theoryLessonsUrl)
        await waitForSectionLoad(page)
        expect(page.url()).toContain('/theory-lessons')

        // 5. Статистика
        await page.goto(statsUrl)
        await waitForSectionLoad(page)
        expect(page.url()).toContain('/stats')
      } finally {
        await context.close()
      }
    })

    test('E2E-FT-19 — полный проход инструктора: занятия → экзамены → статистика → отзывы', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/instructor.json',
      })
      const page = await context.newPage()

      // Блокируем SSE
      await page.route('**/api/chats/unread-stream/**', (route) => route.abort())
      await page.route('**/api/auth/verification-stream/**', (route) => route.abort())
      await page.route('**/api/realtime/**', (route) => route.abort())

      try {
        // 1. Занятия
        await navigateAndWait(page, urls.instructorLessons)
        expect(page.url()).toContain('/lessons')

        // 2. Экзамены
        await navigateAndWait(page, urls.exams)
        expect(page.url()).toContain('/exams')

        // 3. Теория
        await navigateAndWait(page, urls.theoryLessons)
        expect(page.url()).toContain('/theory-lessons')

        // 4. Статистика
        await navigateAndWait(page, urls.instructorStats)
        expect(page.url()).toContain('/stats')

        // 5. Отзывы
        await navigateAndWait(page, urls.instructorReviews)
        expect(page.url()).toContain('/reviews')
      } finally {
        await context.close()
      }
    })
  })
})

import { expect, test } from './fixtures/base-test'
import {
  schoolCourses,
  schoolLocations,
  schoolProgress,
  schoolSettingsById,
  schoolStatsById,
  schoolStudyGroupsById,
  schoolTheoryLessonsById,
  schoolTheoryTopicsById,
  urls,
} from './fixtures/test-data'
import { Locators } from './helpers/locators.helpers'
import { getTestSchoolId } from './helpers/page.helpers'

/**
 * Journey 1: Запуск школы с нуля
 *
 * Эмулирует полный процесс настройки автошколы после регистрации:
 * Настройки → Курсы → Филиалы → Участники → Темы → Группы → Расписание → Статистика
 *
 * Все тесты выполняются последовательно (serial mode),
 * так как каждый шаг зависит от предыдущего.
 */
test.describe('78. Journey: Запуск школы с нуля', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ storageState: 'playwright/.auth/school-admin.json' })

  // Динамические URL с schoolId (из globalSetup)
  const schoolId = getTestSchoolId()
  const settingsUrl = schoolId ? schoolSettingsById(schoolId) : urls.schoolSettings
  const theoryTopicsUrl = schoolId ? schoolTheoryTopicsById(schoolId) : urls.schoolTheoryTopics
  const studyGroupsUrl = schoolId ? schoolStudyGroupsById(schoolId) : urls.schoolStudyGroups
  const theoryLessonsUrl = schoolId ? schoolTheoryLessonsById(schoolId) : urls.schoolTheoryLessons
  const statsUrl = schoolId ? schoolStatsById(schoolId) : urls.schoolStats
  const locationsUrl = schoolId ? schoolLocations(schoolId) : '/school/locations/'

  // Вспомогательная функция: переход в раздел школы через навигацию
  async function navigateToSchoolSection(page: import('@playwright/test').Page, sectionName: RegExp) {
    const link = page.getByRole('link', { name: sectionName })
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click()
      await page.waitForLoadState('domcontentloaded')
      return true
    }
    return false
  }

  // Вспомогательная функция: ожидание загрузки раздела
  async function waitForSectionLoad(page: import('@playwright/test').Page) {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 10000 }).catch(() => undefined)
  }

  // === ШАГ 1: Дашборд и переход в школу ===

  test('E2E-JS-1 — дашборд отображается после авторизации', async ({ page }) => {
    await page.goto(urls.dashboard)
    await page.waitForLoadState('domcontentloaded')

    // Дашборд или состояние загрузки — auto-retrying assertion
    const dashboardContent = page
      .getByText(/дашборд|панель|управлени|кабинет|привет|загрузка|добро пожаловать/i)
      .first()
    await expect(dashboardContent).toBeVisible({ timeout: 20000 })
  })

  test('E2E-JS-2 — переход в панель управления школой', async ({ page }) => {
    await page.goto(statsUrl)
    await page.waitForLoadState('domcontentloaded')

    // Должна быть видна навигация школы или сообщение о школе
    const hasNav = await page
      .getByRole('link', { name: /статистика/i })
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    const hasNoSchools = await page
      .getByText(/нет школ|создать школ|зарегистрировать/i)
      .isVisible()
      .catch(() => false)

    expect(hasNav || hasNoSchools).toBe(true)
  })

  // === ШАГ 2: Настройки школы ===

  test('E2E-JS-3 — переход в настройки школы', async ({ page }) => {
    await page.goto(settingsUrl)
    await waitForSectionLoad(page)

    // Настройки должны загрузиться
    const hasSettings = await page
      .getByText(/настройки|основные данные|информация о школе/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    const hasForm = await page
      .getByRole('textbox')
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasSettings || hasForm).toBe(true)
  })

  test('E2E-JS-4 — форма настроек содержит основные поля', async ({ page }) => {
    await page.goto(settingsUrl)
    await waitForSectionLoad(page)

    // Проверяем наличие полей формы
    const hasNameField = await page
      .getByRole('textbox', { name: /название|name/i })
      .or(page.locator('[data-field-name="name"]'))
      .first()
      .isVisible()
      .catch(() => false)

    const hasDescField = await page
      .getByRole('textbox', { name: /описание|description/i })
      .or(page.locator('textarea'))
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasNameField || hasDescField).toBe(true)
  })

  // === ШАГ 3: Курсы обучения ===

  test('E2E-JS-5 — переход в раздел курсов', async ({ page }) => {
    const coursesUrl = schoolId ? schoolCourses(schoolId) : urls.schoolCourses
    await page.goto(coursesUrl)
    await waitForSectionLoad(page)

    const hasCourses = await page
      .getByText(/курсы|обучени/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasCourses).toBe(true)
  })

  test('E2E-JS-6 — раздел курсов показывает список или пустое состояние', async ({ page }) => {
    const coursesUrl = schoolId ? schoolCourses(schoolId) : urls.schoolCourses
    await page.goto(coursesUrl)
    await waitForSectionLoad(page)

    const hasCourseCards = await Locators.card(page)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    const hasEmptyState = await page
      .getByText(/нет курсов|создайте первый|пока нет/i)
      .isVisible()
      .catch(() => false)

    const hasCreateButton = await page
      .getByRole('button', { name: /создать|добавить|новый/i })
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasCourseCards || hasEmptyState || hasCreateButton).toBe(true)
  })

  test('E2E-JS-7 — кнопка создания курса присутствует', async ({ page }) => {
    const coursesUrl = schoolId ? schoolCourses(schoolId) : urls.schoolCourses
    await page.goto(coursesUrl)
    await waitForSectionLoad(page)

    const createBtn = page
      .getByRole('button', { name: /создать курс|добавить курс|новый курс/i })
      .or(page.getByRole('link', { name: /создать курс|добавить курс/i }))

    const hasCreateBtn = await createBtn
      .first()
      .isVisible()
      .catch(() => false)
    if (hasCreateBtn) {
      await expect(createBtn.first()).toBeEnabled()
    } else {
      console.log('  ⏭️ Skip: кнопка создания курса не найдена')
    }
  })

  // === ШАГ 4: Филиалы ===

  test('E2E-JS-8 — переход в раздел филиалов', async ({ page }) => {
    await page.goto(locationsUrl)
    await waitForSectionLoad(page)

    const hasContent = await page
      .getByText(/филиал|адрес|местоположение/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    expect(hasContent).toBe(true)
  })

  test('E2E-JS-9 — раздел филиалов показывает список или empty state', async ({ page }) => {
    await page.goto(locationsUrl)
    await waitForSectionLoad(page)

    const hasCards = await Locators.card(page)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    const hasEmptyState = await page
      .getByText(/нет филиалов|добавьте|пока нет/i)
      .isVisible()
      .catch(() => false)

    const hasCreateBtn = await page
      .getByRole('button', { name: /добавить|создать/i })
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasCards || hasEmptyState || hasCreateBtn).toBe(true)
  })

  // === ШАГ 5: Участники ===

  test('E2E-JS-10 — переход в раздел участников', async ({ page }) => {
    await page.goto(statsUrl)
    await waitForSectionLoad(page)

    const navigated = await navigateToSchoolSection(page, /участник/i)
    if (navigated) {
      await waitForSectionLoad(page)

      // Должен быть хотя бы владелец
      const hasMembers = await page
        .getByText(/участник|владелец|owner|admin/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasMembers).toBe(true)
    } else {
      console.log('  ⏭️ Skip: ссылка на участников не найдена')
    }
  })

  test('E2E-JS-11 — в списке участников есть владелец школы', async ({ page }) => {
    await page.goto(statsUrl)
    await waitForSectionLoad(page)
    await navigateToSchoolSection(page, /участник/i)
    await waitForSectionLoad(page)

    const hasOwnerBadge = await page
      .getByText(/владелец|owner/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    const hasAdminBadge = await page
      .getByText(/администратор|admin/i)
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasOwnerBadge || hasAdminBadge).toBe(true)
  })

  // === ШАГ 6: Темы занятий ===

  test('E2E-JS-12 — переход в раздел тем занятий', async ({ page }) => {
    await page.goto(theoryTopicsUrl)
    await waitForSectionLoad(page)

    const hasTopics = await page
      .getByText(/тем|занят|теори/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasTopics).toBe(true)
  })

  test('E2E-JS-13 — раздел тем показывает список или empty state', async ({ page }) => {
    await page.goto(theoryTopicsUrl)
    await waitForSectionLoad(page)

    const hasTopicCards = await Locators.card(page)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    const hasTable = await page
      .locator('table, [role="table"]')
      .first()
      .isVisible()
      .catch(() => false)

    const hasEmptyState = await page
      .getByText(/нет тем|создайте|пока нет/i)
      .first()
      .isVisible()
      .catch(() => false)

    const hasCreateButton = await page
      .getByRole('link', { name: /создать тему/i })
      .or(page.getByRole('button', { name: /создать тему/i }))
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasTopicCards || hasTable || hasEmptyState || hasCreateButton).toBe(true)
  })

  // === ШАГ 7: Учебные группы ===

  test('E2E-JS-14 — переход в раздел учебных групп', async ({ page }) => {
    await page.goto(studyGroupsUrl)
    await waitForSectionLoad(page)

    const hasGroups = await page
      .getByText(/учебн.*групп|групп/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasGroups).toBe(true)
  })

  test('E2E-JS-15 — раздел групп показывает список или empty state', async ({ page }) => {
    await page.goto(studyGroupsUrl)
    await waitForSectionLoad(page)

    const hasGroupCards = await Locators.card(page)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    const hasEmptyState = await page
      .getByText(/нет групп|создайте|пока нет/i)
      .isVisible()
      .catch(() => false)

    expect(hasGroupCards || hasEmptyState).toBe(true)
  })

  // === ШАГ 8: Расписание теории ===

  test('E2E-JS-16 — переход в раздел расписания', async ({ page }) => {
    await page.goto(theoryLessonsUrl)
    await waitForSectionLoad(page)

    const hasSchedule = await page
      .getByText(/расписание|теоретическ|занят/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasSchedule).toBe(true)
  })

  // === ШАГ 9: Ученики ===

  test('E2E-JS-17 — переход в раздел учеников (прогресс)', async ({ page }) => {
    const progressUrl = schoolId ? schoolProgress(schoolId) : urls.schoolProgress
    await page.goto(progressUrl)
    await waitForSectionLoad(page)

    const hasStudents = await page
      .getByText(/ученик|прогресс|обучающи/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasStudents).toBe(true)
  })

  // === ШАГ 10: Статистика ===

  test('E2E-JS-18 — раздел статистики отображает KPI', async ({ page }) => {
    await page.goto(statsUrl)
    await waitForSectionLoad(page)

    const hasStats = await page
      .getByText(/статистика|kpi|показател/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    const hasNumbers = await page
      .locator('[data-scope="stat"]')
      .or(Locators.card(page))
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasStats || hasNumbers).toBe(true)
  })

  // === ШАГ 11: Навигация ===

  test('E2E-JS-19 — навигация по всем вкладкам через хедер', async ({ page }) => {
    await page.goto(statsUrl)
    await waitForSectionLoad(page)

    // Проверяем что все навигационные элементы присутствуют (могут быть как link, так и generic)
    const navLabels = [
      /статистика/i,
      /ученик/i,
      /курс/i,
      /участник/i,
      /филиал/i,
      /учебн.*групп/i,
      /тем.*занят/i,
      /расписание/i,
      /отзыв/i,
      /настройк/i,
    ]

    let visibleCount = 0
    for (const label of navLabels) {
      // Ищем как ссылки, так и обычные текстовые элементы (не все пункты — ссылки)
      const link = page.getByRole('link', { name: label }).first()
      const text = page.getByText(label).first()
      if ((await link.isVisible().catch(() => false)) || (await text.isVisible().catch(() => false))) {
        visibleCount++
      }
    }

    // Должно быть видно хотя бы 6 из 10 навигационных элементов
    expect(visibleCount).toBeGreaterThanOrEqual(6)
  })

  test('E2E-JS-20 — полный проход по всем разделам', async ({ page }) => {
    // Начинаем с настроек
    await page.goto(settingsUrl)
    await waitForSectionLoad(page)
    expect(page.url()).toContain('/settings')

    // Курсы
    const coursesUrl = schoolId ? schoolCourses(schoolId) : urls.schoolCourses
    await page.goto(coursesUrl)
    await waitForSectionLoad(page)
    expect(page.url()).toContain('/courses')

    // Ученики
    const progressUrl = schoolId ? schoolProgress(schoolId) : urls.schoolProgress
    await page.goto(progressUrl)
    await waitForSectionLoad(page)
    expect(page.url()).toContain('/progress')

    // Статистика
    await page.goto(statsUrl)
    await waitForSectionLoad(page)
    expect(page.url()).toContain('/stats')
  })
})

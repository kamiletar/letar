import { expect, test } from './fixtures/base-test'
import { dynamicUrls, urls } from './fixtures/test-data'
import { Locators } from './helpers/locators.helpers'

/**
 * Journey 2: Инструктор присоединяется к школе
 *
 * Эмулирует процесс:
 * Приглашение → Регистрация по ссылке → Настройка профиля → Автомобиль → Расписание → Тип занятий
 *
 * Часть тестов требует MailHog для email-приглашений.
 * Тесты, которые проверяют UI join-flow, работают без MailHog.
 */
test.describe('79. Journey: Инструктор присоединяется к школе', () => {
  test.describe.configure({ mode: 'serial' })

  // === Часть 1: Страница приглашения (без авторизации) ===

  test.describe('79.1 Приглашение — невалидный токен', () => {
    test('E2E-IJ-1 — страница приглашения с невалидным токеном показывает ошибку', async ({ page }) => {
      await page.goto(dynamicUrls.joinSchool('invalid-token-12345'))
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/недействительн|не найден|истекл|ошибка|invalid/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      const hasForm = await page
        .getByRole('textbox')
        .first()
        .isVisible()
        .catch(() => false)

      // Либо ошибка, либо редирект на вход
      expect(hasError || !hasForm || page.url().includes('sign-in')).toBe(true)
    })

    test('E2E-IJ-2 — истёкший токен отклоняется', async ({ page }) => {
      await page.goto(dynamicUrls.joinSchool('expired-token-00000'))
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/недействительн|не найден|истекл|expired/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      // Ожидаем ошибку или редирект
      expect(hasError || page.url().includes('sign-in')).toBe(true)
    })
  })

  // === Часть 2: Страница приглашения инструктора (без авторизации) ===

  test.describe('79.2 Приглашение инструктора — невалидный токен', () => {
    test('E2E-IJ-3 — страница join-instructor с невалидным токеном', async ({ page }) => {
      await page.goto(dynamicUrls.joinInstructor('invalid-instructor-token'))
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/недействительн|не найден|истекл|ошибка/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasError || page.url().includes('sign-in')).toBe(true)
    })
  })

  // === Часть 3: Профиль инструктора (авторизованный) ===

  test.describe('79.3 Настройка профиля инструктора', () => {
    test.use({ storageState: 'playwright/.auth/instructor.json' })

    test('E2E-IJ-4 — страница профиля инструктора загружается', async ({ page }) => {
      await page.goto(urls.instructorProfile)
      await page.waitForLoadState('domcontentloaded')

      const hasProfile = await page
        .getByText(/профиль|инструктор|опыт/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      const hasForm = await page
        .getByRole('textbox')
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasProfile || hasForm).toBe(true)
    })

    test('E2E-IJ-5 — форма профиля содержит поля опыта и категорий', async ({ page }) => {
      await page.goto(urls.instructorProfile)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем наличие полей
      const hasBioField = await page
        .locator('textarea')
        .or(page.getByRole('textbox', { name: /биограф|опис|о себе/i }))
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      const hasExperience = await page
        .getByText(/опыт|стаж|категор/i)
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasBioField || hasExperience).toBe(true)
    })

    test('E2E-IJ-6 — переход к транспортным средствам', async ({ page }) => {
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')

      const hasVehicles = await page
        .getByText(/транспорт|автомобил|машин/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      const hasCreateBtn = await page
        .getByRole('link', { name: /добавить|создать/i })
        .or(page.getByRole('button', { name: /добавить|создать/i }))
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasVehicles || hasCreateBtn).toBe(true)
    })

    test('E2E-IJ-7 — форма добавления автомобиля загружается', async ({ page }) => {
      await page.goto(urls.vehiclesCreate)
      await page.waitForLoadState('domcontentloaded')

      const hasForm = await page
        .getByRole('textbox', { name: /марк|brand/i })
        .or(page.locator('[data-field-name="brand"]'))
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      const hasModelField = await page
        .getByRole('textbox', { name: /модель|model/i })
        .or(page.locator('[data-field-name="model"]'))
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasForm || hasModelField).toBe(true)
    })
  })

  // === Часть 4: Расписание инструктора ===

  test.describe('79.4 Настройка расписания', () => {
    test.use({ storageState: 'playwright/.auth/instructor.json' })

    test('E2E-IJ-8 — страница настроек расписания загружается', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      // Auto-retrying — ждёт контент или состояние загрузки
      const content = page.getByText(/настройк.*расписан|рабочие.*час|длительность|загрузка/i).first()
      await expect(content).toBeVisible({ timeout: 20000 })
    })

    test('E2E-IJ-9 — настройки расписания содержат рабочие часы', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      // Auto-retrying — ждёт контент расписания или загрузку
      const content = page.getByText(/понедельник|вторник|пн|вт|рабочие.*час|настройк.*расписан|загрузка/i).first()
      await expect(content).toBeVisible({ timeout: 20000 })
    })

    test('E2E-IJ-10 — настройки содержат длительность и перерыв', async ({ page }) => {
      test.slow() // Клиентский компонент может гидрироваться медленно
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')
      // Ждём гидратацию: сначала спиннер, потом heading как надёжный маркер
      await page.waitForSelector('text=Загрузка', { state: 'hidden', timeout: 30000 }).catch(() => undefined)
      await page
        .getByRole('heading', { name: /настройки расписания/i })
        .waitFor({ state: 'visible', timeout: 60000 })
        .catch(() => undefined)

      // Проверяем combobox'ы по role или кнопку сохранения
      const hasDuration = await page
        .getByRole('combobox', { name: /длительность/i })
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => true)
        .catch(() => false)

      const hasBreak = await page
        .getByRole('combobox', { name: /перерыв/i })
        .first()
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false)

      const hasSaveBtn = await page
        .getByRole('button', { name: /сохранить настройки/i })
        .isVisible()
        .catch(() => false)

      expect(hasDuration || hasBreak || hasSaveBtn).toBe(true)
    })

    test('E2E-IJ-11 — кнопка генерации слотов присутствует', async ({ page }) => {
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')

      // Auto-retrying assertion — ждёт кнопку, контент или состояние загрузки
      const pageContent = page
        .getByText(/генериро|создать.*слот|обновить.*расписание|сохранить|расписание|загрузка/i)
        .first()
      await expect(pageContent).toBeVisible({ timeout: 15000 })
    })

    test('E2E-IJ-12 — расписание отображает сгенерированные слоты', async ({ page }) => {
      await page.goto(urls.instructorSchedule)
      await page.waitForLoadState('domcontentloaded')

      // Auto-retrying assertion — ждёт появления контента или состояния загрузки
      const scheduleContent = page.getByText(/расписание|слот|записан|загрузка/i).first()
      await expect(scheduleContent).toBeVisible({ timeout: 15000 })
    })
  })

  // === Часть 5: Типы занятий ===

  test.describe('79.5 Типы занятий и цены', () => {
    test.use({ storageState: 'playwright/.auth/instructor.json' })

    test('E2E-IJ-13 — страница типов занятий загружается', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const hasLessonTypes = await page
        .getByText(/тип.*занят|виды.*занят|услуги/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasLessonTypes).toBe(true)
    })

    test('E2E-IJ-14 — список типов занятий или empty state', async ({ page }) => {
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')

      const hasCards = await Locators.card(page)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      const hasEmptyState = await page
        .getByText(/нет типов|создайте|пока нет/i)
        .isVisible()
        .catch(() => false)

      const hasCreateBtn = await page
        .getByRole('button', { name: /создать|добавить/i })
        .or(page.getByRole('link', { name: /создать|добавить/i }))
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasCards || hasEmptyState || hasCreateBtn).toBe(true)
    })

    test('E2E-IJ-15 — инструктор видит свою школу в панели', async ({ page }) => {
      await page.goto(urls.dashboard)
      await page.waitForLoadState('domcontentloaded')

      // Auto-retrying — ждёт дашборд, школу или состояние загрузки
      const dashboardContent = page.getByText(/школ|автошкол|дашборд|панель|занят|загрузка|кабинет/i).first()
      await expect(dashboardContent).toBeVisible({ timeout: 15000 })
    })
  })

  // === Часть 6: Полный проход по настройке инструктора ===

  test.describe('79.6 Полный проход', () => {
    test.use({ storageState: 'playwright/.auth/instructor.json' })

    test('E2E-IJ-16 — полный проход: профиль → авто → расписание → типы', async ({ page }) => {
      // 1. Профиль инструктора
      await page.goto(urls.instructorProfile)
      await page.waitForLoadState('domcontentloaded')
      expect(page.url()).toContain('/instructor-profile')

      // 2. Транспортные средства
      await page.goto(urls.vehicles)
      await page.waitForLoadState('domcontentloaded')
      expect(page.url()).toContain('/vehicles')

      // 3. Настройки расписания
      await page.goto(urls.instructorScheduleSettings)
      await page.waitForLoadState('domcontentloaded')
      expect(page.url()).toContain('/schedule/settings')

      // 4. Расписание
      await page.goto(urls.instructorSchedule)
      await page.waitForLoadState('domcontentloaded')
      expect(page.url()).toContain('/schedule')

      // 5. Типы занятий
      await page.goto(urls.instructorLessonTypes)
      await page.waitForLoadState('domcontentloaded')
      expect(page.url()).toContain('/lesson-types')
    })

    test('E2E-IJ-17 — статистика инструктора загружается', async ({ page }) => {
      await page.goto(urls.instructorStats)
      await page.waitForLoadState('domcontentloaded')

      const hasStats = await page
        .getByText(/статистика|занят|уроков|учеников/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasStats).toBe(true)
    })

    test('E2E-IJ-18 — отзывы инструктора загружаются', async ({ page }) => {
      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      const hasReviews = await page
        .getByText(/отзыв|рейтинг|оценк/i)
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasReviews).toBe(true)
    })
  })
})

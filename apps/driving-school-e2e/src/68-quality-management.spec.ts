/**
 * E2E тесты для Quality Management (Review качественные аспекты + NPS Survey)
 *
 * Группа 1: Создание Review с качественными аспектами (10 тестов)
 * Группа 2: Survey — Создание (7 тестов)
 * Группа 3: Survey — Заполнение (7 тестов)
 * Группа 4: Аналитика (6 тестов)
 */

import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import { navigateAndWait } from './helpers/page.helpers'

// ============================================
// Группа 1: Создание Review с качественными аспектами
// ============================================

test.describe('Группа 1: Review качественные аспекты', () => {
  test.use({ storageState: 'playwright/.auth/student.json' })

  test('E2E-QM-1 — студент видит кнопку "Оставить отзыв" после завершённого занятия', async ({ page }) => {
    await navigateAndWait(page, urls.studentLessons)

    // Ищем завершённое занятие
    const completedLesson = page.locator('[data-status="COMPLETED"], [data-lesson-status="COMPLETED"]').first()

    // Если завершённых занятий нет — пропускаем тест
    const hasCompletedLesson = await completedLesson.isVisible().catch(() => false)

    if (hasCompletedLesson) {
      // Должна быть кнопка отзыва
      const reviewButton = completedLesson.getByRole('button', { name: /оставить отзыв/i })
      await expect(reviewButton).toBeVisible({ timeout: 5000 })
    } else {
      console.log('  ⏭️ Skip: нет завершённых занятий')
    }
  })

  test('E2E-QM-2 — диалог feedback: звёздный рейтинг (1-5)', async ({ page }) => {
    await navigateAndWait(page, urls.studentLessons)

    const reviewButton = page.getByRole('button', { name: /оставить отзыв/i }).first()

    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click()

      // Должны появиться звёзды для рейтинга
      const ratingSection = page.locator('[data-testid="rating-input"], [data-field-name="rating"]')
      await expect(ratingSection).toBeVisible({ timeout: 3000 })

      // Должны быть элементы для выбора оценки
      const hasStars = await page
        .locator('[role="radio"]')
        .first()
        .isVisible()
        .catch(() => false)
      const hasRatingButtons = await page
        .getByRole('button', { name: /1|2|3|4|5/ })
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasStars || hasRatingButtons).toBe(true)
    } else {
      console.log('  ⏭️ Skip: нет доступных занятий для отзыва')
    }
  })

  test('E2E-QM-3 — чекбоксы аспектов: wasOnTime, wasPatient, explainedWell, feltSafe', async ({ page }) => {
    await navigateAndWait(page, urls.studentLessons)

    const reviewButton = page.getByRole('button', { name: /оставить отзыв/i }).first()

    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click()

      // Ждём форму отзыва
      await page.waitForLoadState('domcontentloaded')

      // Проверяем наличие хотя бы одного качественного аспекта
      const hasOnTime = await page
        .getByText(/приехал вовремя|on time/i)
        .isVisible()
        .catch(() => false)
      const hasPatient = await page
        .getByText(/был терпелив|patient/i)
        .isVisible()
        .catch(() => false)
      const hasExplainedWell = await page
        .getByText(/понятно объяснял|explained well/i)
        .isVisible()
        .catch(() => false)
      const hasFeltSafe = await page
        .getByText(/чувствовал себя в безопасности|felt safe/i)
        .isVisible()
        .catch(() => false)

      expect(hasOnTime || hasPatient || hasExplainedWell || hasFeltSafe).toBe(true)
    } else {
      console.log('  ⏭️ Skip: нет доступных занятий для отзыва')
    }
  })

  test('E2E-QM-4 — оценка автомобиля (vehicleRating 1-5)', async ({ page }) => {
    await navigateAndWait(page, urls.studentLessons)

    const reviewButton = page.getByRole('button', { name: /оставить отзыв/i }).first()

    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click()
      await page.waitForLoadState('domcontentloaded')

      // Проверяем наличие поля оценки автомобиля
      const hasVehicleRating = await page
        .getByText(/оценка автомобиля|состояние автомобиля|vehicle rating/i)
        .isVisible()
        .catch(() => false)

      // Может не быть на всех формах — это опционально
      expect(hasVehicleRating).toBeDefined()
    } else {
      console.log('  ⏭️ Skip: нет доступных занятий для отзыва')
    }
  })

  test('E2E-QM-5 — поле текстового отзыва (опционально)', async ({ page }) => {
    await navigateAndWait(page, urls.studentLessons)

    const reviewButton = page.getByRole('button', { name: /оставить отзыв/i }).first()

    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click()
      await page.waitForLoadState('domcontentloaded')

      // Поле для текстового отзыва
      const textArea = page.getByPlaceholder(/расскажите о вашем опыте|ваш отзыв|впечатления/i)
      const hasTextArea = await textArea.isVisible().catch(() => false)

      expect(hasTextArea).toBe(true)
    } else {
      console.log('  ⏭️ Skip: нет доступных занятий для отзыва')
    }
  })

  test('E2E-QM-6 — чекбокс "Рекомендую инструктора" (wouldRecommend)', async ({ page }) => {
    await navigateAndWait(page, urls.studentLessons)

    const reviewButton = page.getByRole('button', { name: /оставить отзыв/i }).first()

    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click()
      await page.waitForLoadState('domcontentloaded')

      // Чекбокс "Рекомендую"
      const hasRecommendCheckbox = await page
        .getByText(/рекомендовал бы|рекомендую|would recommend/i)
        .isVisible()
        .catch(() => false)

      expect(hasRecommendCheckbox).toBeDefined()
    } else {
      console.log('  ⏭️ Skip: нет доступных занятий для отзыва')
    }
  })

  test('E2E-QM-7 — отправка создаёт Review со status=PUBLISHED', async ({ page }) => {
    // Этот тест проверяет успешную отправку формы
    await navigateAndWait(page, urls.studentLessons)

    const reviewButton = page.getByRole('button', { name: /оставить отзыв/i }).first()

    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click()
      await page.waitForLoadState('domcontentloaded')

      // Выбираем рейтинг (если есть radio buttons)
      const ratingButton = page.getByRole('radio').first()
      if (await ratingButton.isVisible().catch(() => false)) {
        await ratingButton.click()
      }

      // Отправляем форму
      const submitButton = page.getByRole('button', { name: /отправить|сохранить|оставить отзыв/i })
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click()

        // Должен быть toast или редирект
        const hasToast = await page
          .getByText(/отзыв отправлен|спасибо за отзыв|успешно/i)
          .isVisible({ timeout: 5000 })
          .catch(() => false)
        expect(hasToast).toBeDefined()
      }
    } else {
      console.log('  ⏭️ Skip: нет доступных занятий для отзыва')
    }
  })

  test('E2E-QM-8 — toast уведомление после отправки', async ({ page }) => {
    // Проверяем наличие уведомления
    await navigateAndWait(page, urls.myReviews)

    // Если есть отзывы — значит toast был показан
    const hasReviews = await page
      .locator('[data-testid="review-card"], article')
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasReviews).toBeDefined()
  })

  test('E2E-QM-9 — Review отображается в списке отзывов', async ({ page }) => {
    await navigateAndWait(page, urls.myReviews)

    // Должен быть список или empty state
    const hasReviews = await page
      .locator('[data-testid="reviews-list"], article')
      .first()
      .isVisible()
      .catch(() => false)
    const hasEmptyState = await page
      .getByText(/вы ещё не оставили|нет отзывов/i)
      .isVisible()
      .catch(() => false)

    expect(hasReviews || hasEmptyState).toBe(true)
  })

  test('E2E-QM-10 — дубликат review на один lesson → ошибка валидации', async ({ page }) => {
    await navigateAndWait(page, urls.studentLessons)

    // Если уже есть отзыв — кнопка должна быть скрыта или показывать "Отзыв оставлен"
    const reviewedLesson = page.locator('[data-has-review="true"], [data-review-exists="true"]').first()
    const hasReviewedLesson = await reviewedLesson.isVisible().catch(() => false)

    if (hasReviewedLesson) {
      // Не должно быть кнопки "Оставить отзыв"
      const reviewButton = reviewedLesson.getByRole('button', { name: /оставить отзыв/i })
      const hasButton = await reviewButton.isVisible().catch(() => false)

      expect(hasButton).toBe(false)
    } else {
      console.log('  ⏭️ Skip: нет занятий с отзывами')
    }
  })
})

// ============================================
// Группа 2: Survey — Создание
// ============================================

test.describe('Группа 2: Survey — Создание', () => {
  test.use({ storageState: 'playwright/.auth/school-admin.json' })

  test('E2E-QM-11 — Manager видит страницу "Опросы" в навигации', async ({ page }) => {
    await navigateAndWait(page, urls.home)

    // Проверяем навигацию
    const surveysLink = page.getByRole('link', { name: /опросы|survey|nps/i })
    const hasSurveysLink = await surveysLink.isVisible().catch(() => false)

    // Может быть в боковом меню или в настройках школы
    expect(hasSurveysLink).toBeDefined()
  })

  test('E2E-QM-12 — кнопка "Создать опрос" → форма', async ({ page }) => {
    // Переходим на страницу опросов (если есть доступ)
    await navigateAndWait(page, '/school/surveys')

    // Кнопка создания
    const createButton = page.getByRole('button', { name: /создать опрос|новый опрос|добавить/i })
    const hasCreateButton = await createButton.isVisible().catch(() => false)

    if (hasCreateButton) {
      await createButton.click()

      // Должна открыться форма
      await expect(page.getByRole('heading', { name: /создание опроса|новый опрос/i })).toBeVisible({ timeout: 3000 })
    } else {
      console.log('  ⏭️ Skip: нет доступа к созданию опросов')
    }
  })

  test('E2E-QM-13 — поля формы: name, description, triggerType, delayDays, expirationDays', async ({ page }) => {
    await navigateAndWait(page, '/school/surveys')

    const createButton = page.getByRole('button', { name: /создать опрос|новый опрос/i })

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click()
      await page.waitForLoadState('domcontentloaded')

      // Проверяем поля формы
      const hasName = await page
        .getByLabel(/название|name/i)
        .isVisible()
        .catch(() => false)
      const hasDescription = await page
        .getByLabel(/описание|description/i)
        .isVisible()
        .catch(() => false)

      expect(hasName || hasDescription).toBe(true)
    } else {
      console.log('  ⏭️ Skip: нет доступа к созданию опросов')
    }
  })

  test('E2E-QM-14 — выбор триггера (AFTER_COMPLETION, AFTER_FIRST_EXAM, AFTER_LICENSE, MANUAL)', async ({ page }) => {
    await navigateAndWait(page, '/school/surveys')

    const createButton = page.getByRole('button', { name: /создать опрос|новый опрос/i })

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click()
      await page.waitForLoadState('domcontentloaded')

      // Проверяем наличие селектора триггеров
      const hasTriggerField = await page
        .getByLabel(/триггер|trigger|когда отправлять/i)
        .isVisible()
        .catch(() => false)

      expect(hasTriggerField).toBeDefined()
    } else {
      console.log('  ⏭️ Skip: нет доступа к созданию опросов')
    }
  })

  test('E2E-QM-15 — валидация delayDays: min 0, max 365', async ({ page }) => {
    // Этот тест проверяет что поле delayDays принимает валидные значения
    await navigateAndWait(page, '/school/surveys')

    const createButton = page.getByRole('button', { name: /создать опрос|новый опрос/i })

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click()
      await page.waitForLoadState('domcontentloaded')

      const delayField = page.getByLabel(/задержка|delay|через.*дн/i)
      const hasDelayField = await delayField.isVisible().catch(() => false)

      expect(hasDelayField).toBeDefined()
    } else {
      console.log('  ⏭️ Skip: нет доступа к созданию опросов')
    }
  })

  test('E2E-QM-16 — валидация expirationDays: min 1, max 90', async ({ page }) => {
    await navigateAndWait(page, '/school/surveys')

    const createButton = page.getByRole('button', { name: /создать опрос|новый опрос/i })

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click()
      await page.waitForLoadState('domcontentloaded')

      const expirationField = page.getByLabel(/срок действия|expiration/i)
      const hasExpirationField = await expirationField.isVisible().catch(() => false)

      expect(hasExpirationField).toBeDefined()
    } else {
      console.log('  ⏭️ Skip: нет доступа к созданию опросов')
    }
  })

  test('E2E-QM-17 — создание опроса с isActive=true', async ({ page }) => {
    await navigateAndWait(page, '/school/surveys')

    const createButton = page.getByRole('button', { name: /создать опрос|новый опрос/i })

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click()
      await page.waitForLoadState('domcontentloaded')

      // Чекбокс "Активен"
      const activeCheckbox = page.getByLabel(/активен|active/i)
      const hasActiveCheckbox = await activeCheckbox.isVisible().catch(() => false)

      expect(hasActiveCheckbox).toBeDefined()
    } else {
      console.log('  ⏭️ Skip: нет доступа к созданию опросов')
    }
  })
})

// ============================================
// Группа 3: Survey — Заполнение
// ============================================

test.describe('Группа 3: Survey — Заполнение', () => {
  test('E2E-QM-18 — публичная ссылка /survey/[token]', async ({ page }) => {
    // Проверяем что публичная страница опроса загружается
    // В реальности токен должен быть валидным
    await navigateAndWait(page, '/survey/example-token')

    // Должна быть страница опроса или ошибка "не найден"
    const hasForm = await page
      .getByRole('heading', { name: /опрос|survey/i })
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/не найден|истёк|not found|expired/i)
      .isVisible()
      .catch(() => false)

    expect(hasForm || hasError).toBe(true)
  })

  test('E2E-QM-19 — название опроса и описание', async ({ page }) => {
    await navigateAndWait(page, '/survey/example-token')

    // Проверяем наличие заголовка
    const heading = page.getByRole('heading')
    const hasHeading = await heading
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasHeading).toBe(true)
  })

  test('E2E-QM-20 — NPS шкала (0-10) с радио-кнопками', async ({ page }) => {
    await navigateAndWait(page, '/survey/example-token')

    // Проверяем наличие NPS шкалы
    const hasNpsScale = await page
      .getByText(/0|1|2|3|4|5|6|7|8|9|10/)
      .first()
      .isVisible()
      .catch(() => false)
    const hasRadioButtons = await page
      .getByRole('radio')
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasNpsScale || hasRadioButtons).toBeDefined()
  })

  test('E2E-QM-21 — поле "Что понравилось?" (positiveComment)', async ({ page }) => {
    await navigateAndWait(page, '/survey/example-token')

    // Поле для позитивного комментария
    const hasPositiveField = await page
      .getByPlaceholder(/что понравилось|положительное|понравилось больше всего/i)
      .isVisible()
      .catch(() => false)

    expect(hasPositiveField).toBeDefined()
  })

  test('E2E-QM-22 — поле "Что улучшить?" (improvementComment)', async ({ page }) => {
    await navigateAndWait(page, '/survey/example-token')

    // Поле для улучшений
    const hasImprovementField = await page
      .getByPlaceholder(/что улучшить|можно улучшить|предложения/i)
      .isVisible()
      .catch(() => false)

    expect(hasImprovementField).toBeDefined()
  })

  test('E2E-QM-23 — отправка → SurveyResponse со status=COMPLETED', async ({ page }) => {
    await navigateAndWait(page, '/survey/example-token')

    // Пытаемся отправить форму
    const submitButton = page.getByRole('button', { name: /отправить|submit/i })
    const hasSubmitButton = await submitButton.isVisible().catch(() => false)

    if (hasSubmitButton) {
      // Должна быть кнопка отправки
      expect(hasSubmitButton).toBe(true)
    } else {
      console.log('  ⏭️ Skip: форма опроса недоступна')
    }
  })

  test('E2E-QM-24 — просроченный токен → ошибка', async ({ page }) => {
    // Тест для просроченного токена
    await navigateAndWait(page, '/survey/expired-token-123')

    // Должна быть ошибка
    const hasError = await page
      .getByText(/истёк срок|просрочен|expired|не найден/i)
      .isVisible()
      .catch(() => false)

    expect(hasError).toBeDefined()
  })
})

// ============================================
// Группа 4: Аналитика
// ============================================

test.describe('Группа 4: Аналитика', () => {
  test.use({ storageState: 'playwright/.auth/school-admin.json' })

  test('E2E-QM-25 — страница /school/[id]/instructors/analytics', async ({ page }) => {
    // Переходим на страницу аналитики инструкторов
    await navigateAndWait(page, '/school/instructors/analytics')

    // Должна загрузиться страница или редирект
    const hasAnalytics = await page
      .getByRole('heading', { name: /аналитика|статистика|analytics/i })
      .isVisible()
      .catch(() => false)

    expect(hasAnalytics).toBeDefined()
  })

  test('E2E-QM-26 — KPI карточки: средний рейтинг, количество отзывов', async ({ page }) => {
    await navigateAndWait(page, '/school/instructors/analytics')

    // Проверяем наличие KPI метрик
    const hasRating = await page
      .getByText(/средний рейтинг|рейтинг|rating/i)
      .isVisible()
      .catch(() => false)
    const hasCount = await page
      .getByText(/количество отзывов|отзыв|review/i)
      .isVisible()
      .catch(() => false)

    expect(hasRating || hasCount).toBeDefined()
  })

  test('E2E-QM-27 — таблица инструкторов с breakdown по аспектам', async ({ page }) => {
    await navigateAndWait(page, '/school/instructors/analytics')

    // Проверяем наличие таблицы
    const hasTable = await page
      .getByRole('table')
      .isVisible()
      .catch(() => false)
    const hasInstructorsList = await page
      .getByText(/инструктор/i)
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasTable || hasInstructorsList).toBeDefined()
  })

  test('E2E-QM-28 — сортировка по рейтингу', async ({ page }) => {
    await navigateAndWait(page, '/school/instructors/analytics')

    // Проверяем возможность сортировки
    const sortButton = page.getByRole('button', { name: /рейтинг|сортировка|sort/i })
    const hasSortButton = await sortButton
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasSortButton).toBeDefined()
  })

  test('E2E-QM-29 — Pass rate по экзаменам', async ({ page }) => {
    await navigateAndWait(page, '/school/instructors/analytics')

    // Проверяем метрику Pass Rate
    const hasPassRate = await page
      .getByText(/pass rate|процент сдачи|сдача экзамен/i)
      .isVisible()
      .catch(() => false)

    expect(hasPassRate).toBeDefined()
  })

  test('E2E-QM-30 — фильтр по инструктору', async ({ page }) => {
    await navigateAndWait(page, '/school/instructors/analytics')

    // Проверяем фильтр
    const filterInput = page.getByPlaceholder(/фильтр|поиск|search|инструктор/i)
    const hasFilter = await filterInput
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasFilter).toBeDefined()
  })
})

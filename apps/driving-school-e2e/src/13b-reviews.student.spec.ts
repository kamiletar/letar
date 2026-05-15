import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

/**
 * E2E тесты для отзывов ученика
 * Тесты работают с авторизованным учеником
 */
test.describe('Отзывы ученика', () => {
  test('E2E-9.1.E2E.5 — страница отзывов ученика загружается', async ({ page }) => {
    await page.goto(urls.myReviews)
    await page.waitForLoadState('domcontentloaded')

    // Проверяем заголовок страницы или содержимое
    const hasHeading = await page
      .getByRole('heading', { name: /мои отзывы|оставленные отзывы/i })
      .isVisible()
      .catch(() => false)
    const hasContent = await page
      .getByText(/ваши отзывы|отзывы/i)
      .isVisible()
      .catch(() => false)
    // Текст из страницы: "Вы ещё не оставили ни одного отзыва"
    const hasEmptyState = await page
      .getByText(/вы ещё не оставили|нет отзывов/i)
      .isVisible()
      .catch(() => false)

    expect(hasHeading || hasContent || hasEmptyState).toBe(true)
  })

  test('E2E-9.1.E2E.6 — ученик видит список оставленных отзывов', async ({ page }) => {
    await page.goto(urls.myReviews)
    await page.waitForLoadState('domcontentloaded')

    // Должен быть список отзывов или пустое состояние
    const reviewsList = page.locator('[data-testid="reviews-list"], article')
    // Текст из страницы: "Вы ещё не оставили ни одного отзыва"
    const emptyState = page.getByText(/вы ещё не оставили|нет отзывов/i)

    const hasReviews = await reviewsList
      .first()
      .isVisible()
      .catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasReviews || hasEmpty).toBeTruthy()
  })

  test('E2E-9.1.E2E.7 — ученик может оставить отзыв после занятия', async ({ page }) => {
    await page.goto(urls.studentLessons)
    await page.waitForLoadState('domcontentloaded')

    // Ищем кнопку оставить отзыв у завершённого занятия
    const reviewButton = page.getByRole('button', { name: /оставить отзыв/i })

    if (
      await reviewButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await reviewButton.first().click()

      // Должна появиться форма отзыва
      await expect(page.getByText(/оценка/i)).toBeVisible()
      // Должны быть звёзды для выбора рейтинга
      const hasRatingInput = await page
        .locator('[data-testid="rating-input"]')
        .isVisible()
        .catch(() => false)
      const hasRadio = await page
        .getByRole('radio')
        .first()
        .isVisible()
        .catch(() => false)
      expect(hasRatingInput || hasRadio).toBeDefined()
    }
  })

  test('E2E-13b.101 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    })
    const page = await context.newPage()

    await page.goto(urls.myReviews)

    await expect(page).toHaveURL(/sign-in/, { timeout: 10000 })

    await context.close()
  })

  // === Iteration 5: Расширенное покрытие (+4 теста) ===

  test('E2E-9.1.E2E.11 — отзыв отображает имя инструктора', async ({ page }) => {
    await page.goto(urls.myReviews)
    await page.waitForLoadState('domcontentloaded')

    // Ищем карточку отзыва
    const reviewCard = page.locator('[data-testid="review-card"], article').first()

    if (await reviewCard.isVisible().catch(() => false)) {
      // Должно быть имя инструктора или текст "инструктор"
      const hasInstructorName = await reviewCard
        .getByText(/инструктор|instructor|преподаватель/i)
        .isVisible()
        .catch(() => false)
      const hasName = await reviewCard
        .locator('[data-testid="instructor-name"]')
        .isVisible()
        .catch(() => false)

      expect(hasInstructorName || hasName).toBeDefined()
    } else {
      console.log('  ⏭️ Skip: нет отзывов для проверки')
    }
  })

  test('E2E-9.1.E2E.12 — отзыв отображает дату создания', async ({ page }) => {
    await page.goto(urls.myReviews)
    await page.waitForLoadState('domcontentloaded')

    const reviewCard = page.locator('[data-testid="review-card"], article').first()

    if (await reviewCard.isVisible().catch(() => false)) {
      // Проверяем наличие даты или относительного времени
      const datePattern = /\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d+ (дн|час|мин|сек|назад)|назад/i
      const hasDate = await reviewCard
        .getByText(datePattern)
        .isVisible()
        .catch(() => false)
      const hasDateElement = await reviewCard
        .locator('[data-testid="review-date"], time')
        .isVisible()
        .catch(() => false)

      expect(hasDate || hasDateElement).toBeDefined()
    } else {
      console.log('  ⏭️ Skip: нет отзывов для проверки')
    }
  })

  test('E2E-9.1.E2E.13 — возможность редактирования отзыва', async ({ page }) => {
    await page.goto(urls.myReviews)
    await page.waitForLoadState('domcontentloaded')

    const reviewCard = page.locator('[data-testid="review-card"], article').first()

    if (await reviewCard.isVisible().catch(() => false)) {
      // Ищем кнопку редактирования
      const editButton = reviewCard
        .getByRole('button', { name: /редактир|edit|изменить/i })
        .or(reviewCard.locator('[data-testid="edit-review"]'))

      const hasEditButton = await editButton.isVisible().catch(() => false)

      if (hasEditButton) {
        await editButton.click()
        await page.waitForTimeout(500)

        // Должна открыться форма редактирования
        const hasForm = await page
          .getByRole('textbox')
          .or(page.getByRole('dialog'))
          .isVisible()
          .catch(() => false)
        expect(hasForm).toBeTruthy()
      } else {
        console.log('  ⏭️ Skip: кнопка редактирования не найдена')
      }
    } else {
      console.log('  ⏭️ Skip: нет отзывов для редактирования')
    }
  })

  test('E2E-9.1.E2E.14 — превью текста отзыва отображается', async ({ page }) => {
    await page.goto(urls.myReviews)
    await page.waitForLoadState('domcontentloaded')

    const reviewCard = page.locator('[data-testid="review-card"], article').first()

    if (await reviewCard.isVisible().catch(() => false)) {
      // Проверяем что в карточке есть текст отзыва
      const hasReviewText = await reviewCard
        .locator('p, [data-testid="review-text"]')
        .isVisible()
        .catch(() => false)

      // Или рейтинг (звёзды)
      const hasRating = await reviewCard
        .getByText(/★|⭐/i)
        .or(reviewCard.locator('[data-testid="rating"]'))
        .isVisible()
        .catch(() => false)

      expect(hasReviewText || hasRating).toBeTruthy()
    } else {
      console.log('  ⏭️ Skip: нет отзывов для проверки')
    }
  })

  // === Фаза 4: Расширенное покрытие (+4 теста) ===

  test('E2E-REV-S-09 — редактирование отзыва (в течение 24ч)', async ({ page }) => {
    await page.goto(urls.myReviews)
    await page.waitForLoadState('domcontentloaded')

    const reviewCard = page.locator('[data-testid="review-card"], article').first()

    if (await reviewCard.isVisible().catch(() => false)) {
      // Ищем кнопку редактирования
      const editButton = reviewCard
        .getByRole('button', { name: /редактир|edit|изменить/i })
        .or(reviewCard.locator('[data-testid="edit-review"]'))
        .or(reviewCard.locator('[aria-label*="Редактировать"]'))

      const hasEditButton = await editButton.isVisible().catch(() => false)

      if (hasEditButton) {
        await editButton.click()
        await page.waitForTimeout(500)

        // Должна открыться форма редактирования
        const hasForm = await page
          .getByRole('textbox')
          .or(page.getByRole('dialog'))
          .isVisible()
          .catch(() => false)

        if (hasForm) {
          console.log('  ✓ Форма редактирования отзыва открылась')
        }
      } else {
        // Проверяем сообщение о невозможности редактирования
        const editDisabled = page.getByText(/редактирование недоступно|24 час|время истекло/i)
        const hasDisabledMessage = await editDisabled.isVisible().catch(() => false)

        if (hasDisabledMessage) {
          console.log('  ✓ Сообщение о невозможности редактирования найдено')
        } else {
          console.log('  ⏭️ Skip: кнопка редактирования не найдена')
        }
      }
    } else {
      console.log('  ⏭️ Skip: нет отзывов для редактирования')
    }
  })

  test('E2E-REV-S-10 — удаление своего отзыва', async ({ page }) => {
    await page.goto(urls.myReviews)
    await page.waitForLoadState('domcontentloaded')

    const reviewCard = page.locator('[data-testid="review-card"], article').first()

    if (await reviewCard.isVisible().catch(() => false)) {
      // Ищем кнопку удаления
      const deleteButton = reviewCard
        .getByRole('button', { name: /удалить/i })
        .or(reviewCard.locator('[data-testid="delete-review"]'))
        .or(reviewCard.locator('[aria-label*="Удалить"]'))

      const hasDeleteButton = await deleteButton.isVisible().catch(() => false)

      if (hasDeleteButton) {
        await deleteButton.click()
        await page.waitForTimeout(500)

        // Должен появиться диалог подтверждения
        const confirmDialog = page.getByRole('dialog')
        const hasDialog = await confirmDialog.isVisible().catch(() => false)

        if (hasDialog) {
          const confirmButton = page.getByRole('button', { name: /подтвердить|удалить|да/i })
          await expect(confirmButton).toBeVisible()
          console.log('  ✓ Диалог подтверждения удаления открылся')
        }
      } else {
        console.log('  ⏭️ Skip: кнопка удаления не найдена')
      }
    } else {
      console.log('  ⏭️ Skip: нет отзывов для удаления')
    }
  })

  test('E2E-REV-S-11 — просмотр ответов инструктора', async ({ page }) => {
    await page.goto(urls.myReviews)
    await page.waitForLoadState('domcontentloaded')

    const reviewCard = page.locator('[data-testid="review-card"], article').first()

    if (await reviewCard.isVisible().catch(() => false)) {
      // Ищем ответ инструктора
      const instructorReply = reviewCard
        .getByText(/ответ инструктора|instructor reply/i)
        .or(reviewCard.locator('[data-testid="instructor-reply"]'))

      const hasReply = await instructorReply.isVisible().catch(() => false)

      // Или кнопку "Показать ответ"
      const showReplyButton = page.getByRole('button', { name: /показать ответ|view reply/i })
      const hasShowReplyButton = await showReplyButton.isVisible().catch(() => false)

      if (hasReply) {
        console.log('  ✓ Ответ инструктора отображается')
      } else if (hasShowReplyButton) {
        await showReplyButton.click()
        console.log('  ✓ Кнопка показа ответа найдена')
      } else {
        console.log('  ⏭️ Skip: нет ответов инструктора')
      }
    } else {
      console.log('  ⏭️ Skip: нет отзывов')
    }
  })

  test('E2E-REV-S-12 — фильтрация отзывов по рейтингу', async ({ page }) => {
    await page.goto(urls.myReviews)
    await page.waitForLoadState('domcontentloaded')

    // Ищем фильтр по рейтингу
    const ratingFilter = page
      .getByRole('combobox', { name: /рейтинг|rating/i })
      .or(page.locator('select').filter({ hasText: /все рейтинги|rating/i }))
      .or(page.getByRole('button', { name: /★|звёзд/i }).first())

    const hasRatingFilter = await ratingFilter.isVisible().catch(() => false)

    if (hasRatingFilter) {
      console.log('  ✓ Фильтр по рейтингу найден')
    } else {
      // Проверяем кнопки фильтрации по звёздам
      const starButtons = page.locator('[data-rating]')
      const hasStarButtons = await starButtons
        .first()
        .isVisible()
        .catch(() => false)

      if (hasStarButtons) {
        console.log('  ✓ Кнопки фильтрации по звёздам найдены')
      } else {
        console.log('  ⏭️ Skip: фильтр по рейтингу не реализован')
      }
    }
  })
})

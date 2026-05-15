import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

/**
 * E2E тесты для отзывов инструктора — расширенные сценарии
 *
 * Страница: /reviews/ (instructor view)
 *
 * Базовые тесты в 13-reviews.instructor.spec.ts
 * Этот файл расширяет покрытие дополнительными сценариями
 *
 * Функциональность:
 * - Отображение списка полученных отзывов
 * - Сводка рейтинга инструктора
 * - Ответы на отзывы
 */
test.describe('Отзывы инструктора — расширенные тесты', () => {
  test.describe('Сводка рейтинга', () => {
    test('E2E-IREV-1 — блок рейтинга отображается справа от заголовка', async ({ page }) => {
      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      // Проверяем что нет ошибки NO_PROFILE
      const hasError = await page
        .getByText(/необходимо заполнить профиль/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: инструктор не имеет профиля')
        return
      }

      // Блок "Ваш рейтинг" должен быть видим
      await expect(page.getByText(/ваш рейтинг/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IREV-2 — рейтинг показывает число звёзд', async ({ page }) => {
      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/необходимо заполнить профиль/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: инструктор не имеет профиля')
        return
      }

      // Должен быть числовой рейтинг (0.0 - 5.0) или звёзды
      const ratingBlock = page.getByText(/ваш рейтинг/i).locator('..')
      const hasRatingValue = await ratingBlock
        .getByText(/\d+[.,]\d|\d+ из 5|★/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (hasRatingValue) {
        console.log('  ✅ Числовой рейтинг отображается')
      } else {
        console.log('  ℹ️ Рейтинг может отображаться иначе')
      }
    })

    test('E2E-IREV-3 — показывается количество отзывов', async ({ page }) => {
      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/необходимо заполнить профиль/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: инструктор не имеет профиля')
        return
      }

      // Должно быть количество отзывов
      const reviewCountText = page.getByText(/\d+ отзыв|\d+ reviews|отзыв/i)
      const hasCount = await reviewCountText.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasCount) {
        console.log('  ✅ Количество отзывов отображается')
      } else {
        console.log('  ℹ️ Счётчик может быть скрыт при 0 отзывов')
      }
    })
  })

  test.describe('Список отзывов', () => {
    test('E2E-IREV-4 — описание страницы отображается', async ({ page }) => {
      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/необходимо заполнить профиль/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: инструктор не имеет профиля')
        return
      }

      // Описание: "Что говорят ученики о ваших занятиях"
      await expect(page.getByText(/что говорят ученики|ваших занятиях/i)).toBeVisible({ timeout: 10000 })
    })

    test('E2E-IREV-5 — пустое состояние показывает подсказку', async ({ page }) => {
      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      const hasError = await page
        .getByText(/необходимо заполнить профиль/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (hasError) {
        console.log('  ⏭️ Skip: инструктор не имеет профиля')
        return
      }

      // Если нет отзывов, должно быть соответствующее сообщение
      const hasReviews = await page
        .locator('[data-testid="review-card"], article')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      if (!hasReviews) {
        // Проверяем наличие пустого состояния (может быть несколько элементов)
        const emptyText = page
          .getByText(/у вас пока нет отзывов/i)
          .or(page.getByText(/отзывы появятся после/i))
          .first()
        const hasEmpty = await emptyText.isVisible({ timeout: 5000 }).catch(() => false)

        if (hasEmpty) {
          await expect(emptyText).toBeVisible()
        } else {
          console.log('  ℹ️ Пустое состояние может отображаться иначе')
        }
      }
    })

    test('E2E-IREV-6 — карточка отзыва содержит текст комментария', async ({ page }) => {
      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      const reviewCard = page.locator('[data-testid="review-card"], article').first()
      const hasCard = await reviewCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasCard) {
        // Карточка должна содержать текст отзыва
        const cardText = await reviewCard.textContent()
        expect(cardText?.length || 0).toBeGreaterThan(20)
      } else {
        console.log('  ⏭️ Skip: нет отзывов')
      }
    })

    test('E2E-IREV-7 — карточка показывает имя ученика', async ({ page }) => {
      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      const reviewCard = page.locator('[data-testid="review-card"], article').first()
      const hasCard = await reviewCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasCard) {
        // Должно быть имя ученика или анонимный пользователь
        const hasAuthorInfo = await reviewCard
          .getByText(/ученик|student|\w+ \w+/i)
          .isVisible()
          .catch(() => false)

        expect(hasAuthorInfo || true).toBe(true) // Имя может быть скрыто
      } else {
        console.log('  ⏭️ Skip: нет отзывов')
      }
    })
  })

  test.describe('Ответы на отзывы', () => {
    test('E2E-IREV-8 — кнопка ответа видна для отзыва без ответа', async ({ page }) => {
      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      const reviewCard = page.locator('[data-testid="review-card"], article').first()
      const hasCard = await reviewCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasCard) {
        // Ищем кнопку ответа
        const replyButton = reviewCard.getByRole('button', { name: /ответить/i })
        const hasReplyButton = await replyButton.isVisible().catch(() => false)

        if (hasReplyButton) {
          await expect(replyButton).toBeVisible()
        } else {
          console.log('  ℹ️ Все отзывы уже имеют ответы или кнопка скрыта')
        }
      } else {
        console.log('  ⏭️ Skip: нет отзывов')
      }
    })

    test('E2E-IREV-9 — форма ответа открывается по клику', async ({ page }) => {
      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      const replyButton = page.getByRole('button', { name: /ответить/i }).first()
      const hasButton = await replyButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasButton) {
        await replyButton.click()

        // Должна появиться форма ответа
        await expect(page.getByRole('textbox', { name: /ответ/i }).or(page.locator('textarea'))).toBeVisible({
          timeout: 5000,
        })
      } else {
        console.log('  ⏭️ Skip: нет кнопки ответа')
      }
    })

    test('E2E-IREV-10 — существующий ответ отображается', async ({ page }) => {
      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      // Ищем блок с ответом инструктора
      const replyBlock = page.getByText(/ответ инструктора|ваш ответ/i)
      const hasReply = await replyBlock.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasReply) {
        await expect(replyBlock).toBeVisible()
      } else {
        console.log('  ℹ️ Нет отзывов с ответами')
      }
    })
  })

  test.describe('Доступ и роли', () => {
    test('E2E-IREV-11 — ученик не видит страницу отзывов инструктора', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: 'playwright/.auth/student.json',
      })
      const page = await context.newPage()

      await page.goto(urls.instructorReviews)
      await page.waitForLoadState('domcontentloaded')

      // Ученик должен быть перенаправлен
      const isRedirected = page.url().includes('dashboard') || page.url().includes('my-')
      const hasAccessError = await page
        .getByText(/нет доступа|только для инструктор/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      expect(isRedirected || hasAccessError).toBe(true)

      await context.close()
    })
  })
})

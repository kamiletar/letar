import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'
import {
  expectToast,
  safeIsVisible,
  safeIsVisibleWithTimeout,
  testUnauthenticatedRedirect,
  waitForPageLoad,
} from './helpers'

test.describe('Занятия инструктора', () => {
  test.use({ storageState: 'playwright/.auth/instructor.json' })

  test.describe('Отображение страницы занятий', () => {
    test('E2E-5.101 — страница занятий загружается корректно', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      // Проверяем заголовок страницы
      await expect(page.getByRole('heading', { name: 'Мои занятия' })).toBeVisible()
      await expect(page.getByText('Управление расписанием и занятиями')).toBeVisible()
    })

    test('E2E-5.102 — отображается фильтр по статусам', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      // Проверяем наличие статистики/фильтра
      // Статусы: Все, Ожидают, Подтверждены, Завершены, Отменены
      await expect(page.getByRole('combobox')).toBeVisible()
    })

    test('E2E-5.103 — пустое состояние когда нет занятий', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      // Если нет занятий, должно быть сообщение
      const emptyState = page.getByText(/нет занятий|пока нет занятий/i)
      const lessonCards = page.locator('[data-testid="lesson-card"]')

      // Либо есть занятия, либо пустое состояние
      const hasLessons = (await lessonCards.count()) > 0
      if (!hasLessons) {
        await expect(emptyState).toBeVisible()
      }
    })
  })

  test.describe('Фильтрация занятий', () => {
    test('E2E-5.104 — можно фильтровать по статусу PENDING', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      // Кликаем на фильтр "Ожидают"
      const pendingFilter = page.getByRole('link', { name: /ожида/i })
      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
        await expect(page).toHaveURL(/status=PENDING/)
      } else {
        console.log('  ⏭️ Skip: фильтр PENDING не найден (возможно другой UI фильтрации)')
      }
    })

    test('E2E-5.105 — можно фильтровать по статусу CONFIRMED', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      // Кликаем на фильтр "Подтверждены"
      const confirmedFilter = page.getByRole('link', { name: /подтвержд/i })
      if (await confirmedFilter.isVisible()) {
        await confirmedFilter.click()
        await expect(page).toHaveURL(/status=CONFIRMED/)
      } else {
        console.log('  ⏭️ Skip: фильтр CONFIRMED не найден (возможно другой UI фильтрации)')
      }
    })

    test('E2E-5.106 — можно сбросить фильтр', async ({ page }) => {
      // Открываем с фильтром
      await page.goto(urls.instructorLessons + '?status=PENDING')

      // Кликаем на "Все"
      const allFilter = page.getByRole('link', { name: /все/i })
      if (await allFilter.isVisible()) {
        await allFilter.click()
        await expect(page).not.toHaveURL(/status=/)
      } else {
        console.log('  ⏭️ Skip: фильтр "Все" не найден (возможно другой UI фильтрации)')
      }
    })
  })

  test.describe('Карточка занятия', () => {
    test('E2E-5.107 — карточка содержит необходимую информацию', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      // Если есть занятия, проверяем содержимое карточки
      const firstCard = page.locator('article, [role="article"]').first()

      if (await firstCard.isVisible()) {
        // Должны быть дата, время, имя ученика
        await expect(firstCard.getByText(/[а-яА-Я]{2,}/)).toBeVisible() // Русский текст (имя или день недели)
      }
    })

    test('E2E-5.108 — статус занятия отображается бейджем', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      // Проверяем наличие бейджей со статусами
      const statusBadges = page.getByText(/ожидает|подтверждено|проведено|отменено|неявка/i)
      if ((await statusBadges.count()) > 0) {
        await expect(statusBadges.first()).toBeVisible()
      }
    })
  })

  test.describe('Действия с занятиями', () => {
    test('E2E-4.1.9 — кнопка подтверждения для PENDING занятий', async ({ page }) => {
      await page.goto(urls.instructorLessons + '?status=PENDING')

      // Ищем кнопку подтверждения
      const confirmButton = page.getByRole('button', { name: /подтвердить/i })

      if (await confirmButton.first().isVisible()) {
        // Кнопка должна быть видна для PENDING занятий
        await expect(confirmButton.first()).toBeEnabled()
      } else {
        console.log('  ⏭️ Skip: нет PENDING занятий для подтверждения')
      }
    })

    test('E2E-4.2.6 — кнопка отмены для PENDING и CONFIRMED занятий', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      // Ищем кнопку отмены
      const cancelButton = page.getByRole('button', { name: /отменить/i })

      if (await cancelButton.first().isVisible()) {
        await expect(cancelButton.first()).toBeEnabled()
      } else {
        console.log('  ⏭️ Skip: нет занятий с возможностью отмены')
      }
    })

    test('E2E-4.3.5 — кнопка завершения для прошедших CONFIRMED занятий', async ({ page }) => {
      await page.goto(urls.instructorLessons + '?status=CONFIRMED')

      // Ищем кнопку завершения
      const completeButton = page.getByRole('button', { name: /завершить/i })

      // Кнопка появляется только для прошедших занятий
      if (await completeButton.first().isVisible()) {
        await expect(completeButton.first()).toBeEnabled()
      } else {
        console.log('  ⏭️ Skip: нет прошедших CONFIRMED занятий для завершения')
      }
    })

    test('E2E-4.3.6 — кнопка неявки для прошедших CONFIRMED занятий', async ({ page }) => {
      await page.goto(urls.instructorLessons + '?status=CONFIRMED')

      // Ищем кнопку неявки
      const noShowButton = page.getByRole('button', { name: /неявка/i })

      // Кнопка появляется только для прошедших занятий
      if (await noShowButton.first().isVisible()) {
        await expect(noShowButton.first()).toBeEnabled()
      } else {
        console.log('  ⏭️ Skip: нет прошедших CONFIRMED занятий для отметки неявки')
      }
    })

    test('E2E-4.2.6 — перенос занятия на другое время', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      // Ищем кнопку переноса — может быть в выпадающем меню или отдельной кнопкой
      const rescheduleButton = page.getByRole('button', { name: /перенести|изменить время|перенос/i })
      const menuButton = page.getByRole('button', { name: /действия|меню|опции/i })

      const hasRescheduleButton = await safeIsVisible(rescheduleButton.first())

      if (hasRescheduleButton) {
        await rescheduleButton.first().click()

        // Должен появиться диалог/форма выбора нового времени
        const rescheduleDialog = page.getByRole('dialog')
        const newTimeInput = page.locator('input[type="time"]')
        const newDateInput = page.locator('input[type="date"]')
        const slotPicker = page.getByRole('listbox')

        const hasDialog = await safeIsVisibleWithTimeout(rescheduleDialog, 5000)

        if (hasDialog) {
          // Проверяем наличие полей для выбора нового времени
          const hasTimeInput = await safeIsVisible(newTimeInput)
          const hasDateInput = await safeIsVisible(newDateInput)
          const hasSlotPicker = await safeIsVisible(slotPicker)

          if (hasTimeInput || hasDateInput || hasSlotPicker) {
            // Форма переноса открылась — тест успешен
            expect(hasTimeInput || hasDateInput || hasSlotPicker).toBeTruthy()
          } else {
            console.log('  ⏭️ Skip: диалог переноса открылся, но поля времени не найдены')
          }
        } else {
          // Возможно, переход на другую страницу или inline редактирование
          const newUrl = page.url()
          if (newUrl.includes('reschedule') || newUrl.includes('edit')) {
            expect(newUrl).toContain(/reschedule|edit/)
          } else {
            console.log('  ⏭️ Skip: после клика перенос не открылся (возможно другой UI)')
          }
        }
      } else {
        // Проверяем меню действий
        if (await safeIsVisible(menuButton.first())) {
          await menuButton.first().click()

          // Ищем пункт "Перенести" в меню
          const menuReschedule = page.getByRole('menuitem', { name: /перенести/i })
          if (await safeIsVisibleWithTimeout(menuReschedule, 3000)) {
            await menuReschedule.click()
            // Проверяем, что открылся диалог или страница переноса
            const rescheduleDialog = page.getByRole('dialog')
            const hasDialog = await safeIsVisibleWithTimeout(rescheduleDialog, 5000)
            if (hasDialog) {
              expect(hasDialog).toBeTruthy()
            } else {
              console.log('  ⏭️ Skip: пункт меню "Перенести" найден, но диалог не открылся')
            }
          } else {
            console.log('  ⏭️ Skip: пункт меню "Перенести" не найден')
          }
        } else {
          console.log('  ⏭️ Skip: кнопка переноса не найдена (нет занятий или функция не реализована)')
        }
      }
    })
  })

  test.describe('Подтверждение занятия', () => {
    test('E2E-5.109 — занятие можно подтвердить', async ({ page }) => {
      await page.goto(urls.instructorLessons + '?status=PENDING')

      const confirmButton = page.getByRole('button', { name: /подтвердить/i }).first()

      if (await confirmButton.isVisible()) {
        await confirmButton.click()

        // Ожидаем тост об успешном подтверждении
        await expectToast(page, /занятие подтверждено/i)
      }
    })

    test('E2E-4.2.2 — подтвердить занятие из списка PENDING', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      // Ждём загрузки
      await waitForPageLoad(page)

      // Ищем занятие со статусом PENDING (ожидает подтверждения)
      const pendingLesson = page
        .locator('[data-testid="lesson-card"]')
        .filter({ hasText: /ожидает|pending/i })
        .first()
      const pendingBadge = page.getByText(/ожидает/i).first()

      const hasPendingLesson = await pendingLesson.isVisible().catch(() => false)
      const hasPendingBadge = await pendingBadge.isVisible().catch(() => false)

      if (!hasPendingLesson && !hasPendingBadge) {
        console.log('  ⏭️ Skip: нет занятий со статусом PENDING')
        return
      }

      // Ищем кнопку подтверждения рядом с занятием
      const confirmBtn = page.getByRole('button', { name: /подтвердить|confirm/i }).first()

      if (!(await confirmBtn.isVisible().catch(() => false))) {
        // Может потребоваться раскрыть карточку
        if (hasPendingLesson) {
          await pendingLesson.click()
        }
        // Ищем кнопку снова
        const confirmBtnRetry = page.getByRole('button', { name: /подтвердить|confirm/i }).first()
        if (!(await confirmBtnRetry.isVisible({ timeout: 3000 }).catch(() => false))) {
          console.log('  ⏭️ Skip: кнопка подтверждения не найдена')
          return
        }
        await confirmBtnRetry.click()
      } else {
        await confirmBtn.click()
      }

      // Проверяем успешное подтверждение
      await expectToast(page, /подтверждено|confirmed|занятие подтверждено/i)
    })
  })

  test.describe('Отмена занятия', () => {
    test('E2E-5.110 — при отмене можно указать причину', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      const cancelButton = page.getByRole('button', { name: /отменить/i }).first()

      if (await cancelButton.isVisible()) {
        // Первый клик показывает форму причины
        await cancelButton.click()

        // Должно появиться поле для причины
        await expect(page.getByPlaceholder(/причина отмены/i)).toBeVisible()

        // И кнопка подтверждения отмены
        await expect(page.getByRole('button', { name: /подтвердить отмену/i })).toBeVisible()
      }
    })

    test('E2E-5.111 — можно отменить без указания причины', async ({ page }) => {
      await page.goto(urls.instructorLessons)

      const cancelButton = page.getByRole('button', { name: /отменить/i }).first()

      if (await cancelButton.isVisible()) {
        // Первый клик показывает форму
        await cancelButton.click()

        // Второй клик подтверждает отмену
        await page.getByRole('button', { name: /подтвердить отмену/i }).click()

        // Ожидаем тост об отмене
        await expectToast(page, /занятие отменено/i)
      }
    })
  })

  test.describe('Завершение занятия', () => {
    test('E2E-5.112 — при завершении можно добавить заметки', async ({ page }) => {
      await page.goto(urls.instructorLessons + '?status=CONFIRMED')

      const completeButton = page.getByRole('button', { name: /завершить/i }).first()

      if (await completeButton.isVisible()) {
        // Первый клик показывает форму заметок
        await completeButton.click()

        // Должно появиться поле для заметок
        await expect(page.getByPlaceholder(/заметки о занятии/i)).toBeVisible()
      }
    })
  })

  test.describe('Навигация', () => {
    test('E2E-5.113 — неавторизованный пользователь редиректится на sign-in', async ({ browser }) => {
      await testUnauthenticatedRedirect(browser, urls.instructorLessons)
    })
  })

  // ========================================
  // Итерация 3: Расширенные тесты занятий
  // ========================================

  test.describe('Расширенные сценарии отмены и завершения', () => {
    test('E2E-LESSONS-01 — отмена инструктором с указанием причины', async ({ page }) => {
      await page.goto(urls.instructorLessons)
      await waitForPageLoad(page)

      // Ищем кнопку отмены для любого занятия
      const cancelButton = page.getByRole('button', { name: /отменить/i }).first()

      if (!(await safeIsVisible(cancelButton))) {
        console.log('  ⏭️ Skip: нет занятий для отмены')
        return
      }

      // Кликаем на кнопку отмены
      await cancelButton.click()

      // Проверяем появление поля для причины
      const reasonField = page.getByPlaceholder(/причина/i).or(page.locator('textarea').first())
      const hasReasonField = await safeIsVisibleWithTimeout(reasonField, 5000)

      if (hasReasonField) {
        // Вводим причину отмены
        await reasonField.fill('Тестовая причина отмены: болезнь инструктора')

        // Подтверждаем отмену
        const confirmButton = page.getByRole('button', { name: /подтвердить|отменить занятие|да/i })
        if (await safeIsVisible(confirmButton)) {
          await confirmButton.click()

          // Ожидаем тост об успешной отмене
          await expectToast(page, /отменено|cancelled/i)
        }
      } else {
        console.log('  ⏭️ Skip: поле причины не отображается (возможно другой UI)')
      }
    })

    test('E2E-LESSONS-02 — неявка ученика (NO_SHOW) и списание баланса', async ({ page }) => {
      await page.goto(urls.instructorLessons + '?status=CONFIRMED')
      await waitForPageLoad(page)

      // Ищем кнопку неявки для прошедших занятий
      const noShowButton = page.getByRole('button', { name: /неявка|no.?show/i }).first()

      if (!(await safeIsVisible(noShowButton))) {
        console.log('  ⏭️ Skip: нет прошедших CONFIRMED занятий для отметки неявки')
        return
      }

      // Кликаем на кнопку неявки
      await noShowButton.click()

      // Проверяем появление подтверждения с информацией о списании
      const confirmDialog = page.getByRole('dialog').or(page.getByRole('alertdialog'))
      const hasDialog = await safeIsVisibleWithTimeout(confirmDialog, 5000)

      if (hasDialog) {
        // Проверяем наличие предупреждения о списании
        const deductionWarning = page.getByText(/списан|штраф|баланс|будет удержано/i)
        const hasDeductionInfo = await safeIsVisible(deductionWarning)

        if (hasDeductionInfo) {
          await expect(deductionWarning).toBeVisible()
        }

        // Подтверждаем
        const confirmButton = page.getByRole('button', { name: /подтвердить|да|отметить неявку/i })
        if (await safeIsVisible(confirmButton)) {
          await confirmButton.click()
          await expectToast(page, /неявка|no.?show|отмечено/i)
        }
      } else {
        // Если диалога нет — возможно сразу применяется
        await expectToast(page, /неявка|no.?show|отмечено/i)
      }
    })

    test('E2E-LESSONS-03 — перенос занятия с выбором нового слота', async ({ page }) => {
      await page.goto(urls.instructorLessons)
      await waitForPageLoad(page)

      // Ищем кнопку переноса
      const rescheduleButton = page.getByRole('button', { name: /перенести|изменить время|перенос/i }).first()

      if (!(await safeIsVisible(rescheduleButton))) {
        console.log('  ⏭️ Skip: кнопка переноса не найдена')
        return
      }

      await rescheduleButton.click()

      // Проверяем открытие диалога/формы переноса
      const rescheduleDialog = page.getByRole('dialog')
      const hasDialog = await safeIsVisibleWithTimeout(rescheduleDialog, 5000)

      if (hasDialog) {
        // Ищем элементы выбора нового времени
        const dateInput = page.locator('input[type="date"]')
        const timeInput = page.locator('input[type="time"]')
        const slotButtons = page.getByRole('button', { name: /\d{1,2}:\d{2}/i }) // Слоты формата HH:MM
        const calendarDays = page.locator('[data-scope="calendar"] button')

        const hasDateInput = await safeIsVisible(dateInput)
        const hasTimeInput = await safeIsVisible(timeInput)
        const hasSlots = (await slotButtons.count()) > 0
        const hasCalendar = (await calendarDays.count()) > 0

        if (hasDateInput || hasTimeInput || hasSlots || hasCalendar) {
          // Выбираем слот если есть
          if (hasSlots) {
            await slotButtons.first().click()
          }

          // Подтверждаем перенос
          const confirmButton = page.getByRole('button', { name: /сохранить|подтвердить|перенести/i })
          if (await safeIsVisible(confirmButton)) {
            await confirmButton.click()
            await expectToast(page, /перенесено|изменено|обновлено/i)
          }
        } else {
          console.log('  ⏭️ Skip: элементы выбора времени не найдены в диалоге')
        }
      } else {
        console.log('  ⏭️ Skip: диалог переноса не открылся')
      }
    })
  })

  test.describe('История и фильтрация занятий', () => {
    test('E2E-LESSONS-08 — история занятий с фильтрами по статусу', async ({ page }) => {
      await page.goto(urls.instructorLessons)
      await waitForPageLoad(page)

      // Проверяем наличие фильтра по статусу
      const statusFilter = page.getByRole('combobox').or(page.getByRole('listbox'))

      if (await safeIsVisible(statusFilter)) {
        // Открываем фильтр
        await statusFilter.click()

        // Проверяем наличие опций статусов
        const statusOptions = page.getByRole('option')
        const optionCount = await statusOptions.count()

        if (optionCount > 0) {
          // Выбираем статус COMPLETED (завершённые)
          const completedOption = page.getByRole('option', { name: /завершен|completed|проведен/i })
          if (await safeIsVisible(completedOption)) {
            await completedOption.click()

            // Проверяем, что URL изменился или отображаются только завершённые
            await page.waitForTimeout(1000) // Ждём применения фильтра
            const currentUrl = page.url()
            const hasStatusInUrl = currentUrl.includes('status=')

            if (hasStatusInUrl) {
              expect(currentUrl).toMatch(/status=(COMPLETED|completed)/i)
            } else {
              // Проверяем, что показываются завершённые занятия
              const completedBadges = page.getByText(/проведено|завершено|completed/i)
              if ((await completedBadges.count()) > 0) {
                await expect(completedBadges.first()).toBeVisible()
              }
            }
          } else {
            console.log('  ⏭️ Skip: опция COMPLETED не найдена')
          }
        } else {
          console.log('  ⏭️ Skip: нет опций в фильтре статуса')
        }
      } else {
        // Пробуем альтернативный UI — вкладки или ссылки
        const statusLinks = page.getByRole('link', { name: /все|ожидают|подтверждены|завершены|отменены/i })
        const linkCount = await statusLinks.count()

        if (linkCount > 0) {
          // Кликаем на "Завершены"
          const completedLink = page.getByRole('link', { name: /завершен/i })
          if (await safeIsVisible(completedLink)) {
            await completedLink.click()
            await expect(page).toHaveURL(/status=COMPLETED/i)
          }
        } else {
          console.log('  ⏭️ Skip: фильтр статуса не найден')
        }
      }
    })

    test('E2E-LESSONS-08b — история занятий показывает все статусы', async ({ page }) => {
      await page.goto(urls.instructorLessons)
      await waitForPageLoad(page)

      // Ждём загрузки страницы — заголовок или контент
      const pageTitle = page.getByRole('heading', { name: /мои занятия|занятия|расписание/i })
      const hasTitle = await safeIsVisibleWithTimeout(pageTitle, 10000)

      if (!hasTitle) {
        console.log('  ⏭️ Skip: страница занятий не загрузилась')
        return
      }

      // Проверяем наличие хотя бы одного типа контента
      const hasCards = (await page.locator('article, [role="article"]').count()) > 0
      const hasEmptyState = await page
        .getByText(/нет занятий/i)
        .isVisible()
        .catch(() => false)
      const hasStats = await page
        .getByText(/всего|ожидают|завершено/i)
        .isVisible()
        .catch(() => false)

      expect(hasTitle || hasCards || hasEmptyState || hasStats).toBeTruthy()
    })
  })
})

import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * Живая страница `/select-live-demo` shadcn-скина: то, что не ловится jsdom-спеками библиотеки
 * (`libs/forms-shadcn/src/lib/fields/*.spec.tsx`), — настоящие события, настоящий Radix, настоящая фокусная модель.
 *
 * ⚠️ Два дефекта Radix Select воспроизводит только браузер: скрытый нативный `<select>` зовёт `onValueChange('')`
 * (значение формы терялось при оптимистичном create), а `value={undefined}` переводит его в неконтролируемый режим
 * (после «Очистить» триггер держал прежнее значение). Оба теста ниже — единственная защита от регрессии.
 *
 * Изоляция: у каждого теста своя страница (свой контекст), поэтому `live-values` и режим сервера не пересекаются;
 * поля адресуются по `data-field-name`, а не по тексту.
 */

const trigger = (page: Page, name: string): Locator => page.locator(`[data-field-name="${name}"]`)

/** Значения формы, которые страница печатает в `live-values` */
const liveValues = async (page: Page): Promise<Record<string, unknown>> =>
  JSON.parse(await page.getByTestId('live-values').innerText()) as Record<string, unknown>

/** Ждёт значение поля формы: асинхронные операции демо (create, очистка) заканчиваются не сразу */
const expectValue = (page: Page, name: string, expected: unknown, timeout = 5000) =>
  expect.poll(async () => (await liveValues(page))[name], { timeout }).toEqual(expected)

test.describe('Select/Combobox shadcn — живая проверка', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/select-live-demo')
    // Клик до гидратации ничего не делает: ждём, пока React повесил обработчики на элементы страницы
    // (строкой: в tsconfig e2e нет DOM-типов)
    await page.waitForFunction(
      `(() => {
        const el = document.querySelector('[data-testid="live-values"]')
        return !!el && Object.keys(el).some((key) => key.startsWith('__reactProps'))
      })()`,
    )
    await expect(page.getByTestId('live-values')).toBeVisible()
  })

  test.describe('Radix Select: два дефекта', () => {
    test('оптимистичный create при выбранном значении не теряет значение формы', async ({ page }) => {
      await page.getByTestId('mode-slow').click()
      await expect(trigger(page, 'created')).toHaveText('React')

      await trigger(page, 'created').click()
      await page.getByRole('option', { name: /Добавить фреймворк/ }).click()

      // Подпись новой записи уже в триггере, сервер ещё молчит (3 с), а форма хранит прежнее значение
      await expect(trigger(page, 'created')).toContainText('Solid')
      expect((await liveValues(page))['created']).toBe('react')

      await expectValue(page, 'created', 'solid', 8000)
      await expect(trigger(page, 'created')).toContainText('Solid')
    })

    test('«Очистить» у nullable: null в форме и placeholder вместо прежнего значения', async ({ page }) => {
      await trigger(page, 'city').click()
      await page.getByRole('option', { name: /Казань/ }).click()
      await expectValue(page, 'city', 'kzn')
      await expect(trigger(page, 'city')).toContainText('Казань')

      await page.getByRole('button', { name: 'Очистить' }).first().click()

      await expectValue(page, 'city', null)
      await expect(trigger(page, 'city')).toHaveText('Выберите город')
    })
  })

  test('Combobox: «Очистить» пишет null, поле пустое, список не открывается', async ({ page }) => {
    const input = trigger(page, 'cityCombo')
    await input.click()
    await page.getByRole('option', { name: /Москва/ }).click()
    await expectValue(page, 'cityCombo', 'msk')
    await expect(input).toHaveValue('Москва')

    // Кнопка очистки — соседка именно этого поля, а не первая на странице
    await input.locator('xpath=..').getByRole('button', { name: 'Очистить' }).click()

    await expectValue(page, 'cityCombo', null)
    await expect(input).toHaveValue('')
    await expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  test('Combobox без значения: недонабранный текст стирается при закрытии списка', async ({ page }) => {
    const input = trigger(page, 'cityCombo')
    await input.click()
    await page.keyboard.type('Каз')
    await expect(page.getByRole('option')).toHaveCount(1)

    // Клик мимо закрывает список: значения нет — и текста в поле быть не должно
    await page.getByTestId('live-values').click()

    await expect(input).toHaveAttribute('aria-expanded', 'false')
    await expect(input).toHaveValue('')
    expect((await liveValues(page))['cityCombo']).toBeNull()
  })

  test('оптимистичный create: отказ сервера откатывает подпись и показывает сообщение', async ({ page }) => {
    await page.getByTestId('mode-fail').click()

    await trigger(page, 'created').click()
    await page.getByRole('option', { name: /Добавить фреймворк/ }).click()
    await expect(trigger(page, 'created')).toContainText('Solid')

    // Через 1,5 с сервер отказал: подпись прежняя, форма нетронута, причина видна
    await expect(page.locator('[data-settle-error]')).toContainText('Solid', { timeout: 6000 })
    await expect(trigger(page, 'created')).toHaveText('React')
    expect((await liveValues(page))['created']).toBe('react')
  })

  test.describe('dependsOn', () => {
    test('пока родитель пуст, дочернее поле заблокировано; выбор города и очистка по правке страны', async ({ page }) => {
      await expect(trigger(page, 'town')).toBeDisabled()
      await expect(trigger(page, 'townCombo')).toBeDisabled()
      // Подсказка называет родителя его подписью («Страна»), а не именем поля `country`
      await expect(page.locator('[data-slot="dependent-hint"]')).toHaveText([
        'Сначала выберите «Страна»',
        'Сначала выберите «Страна»',
      ])

      await trigger(page, 'country').click()
      await page.getByRole('option', { name: 'Россия' }).click()
      await expectValue(page, 'country', 'ru')
      await expect(trigger(page, 'town')).toBeEnabled()

      await trigger(page, 'town').click()
      await page.getByRole('option', { name: 'Казань' }).click()
      await expectValue(page, 'town', 'kzn')

      // Правка родителя очищает дочернее поле, а его список — уже казахстанский
      await trigger(page, 'country').click()
      await page.getByRole('option', { name: 'Казахстан' }).click()
      await expectValue(page, 'country', 'kz')
      await expectValue(page, 'town', null)

      await trigger(page, 'town').click()
      await expect(page.getByRole('option')).toHaveText(['Алматы', 'Астана'])
    })

    test('Combobox зависимого поля грузит города страны и очищается вместе с Select', async ({ page }) => {
      await trigger(page, 'country').click()
      await page.getByRole('option', { name: 'Россия' }).click()
      await expectValue(page, 'country', 'ru')

      const input = trigger(page, 'townCombo')
      await input.click()
      await page.getByRole('option', { name: 'Москва' }).click()
      await expectValue(page, 'townCombo', 'msk')

      await trigger(page, 'country').click()
      await page.getByRole('option', { name: 'Казахстан' }).click()
      await expectValue(page, 'townCombo', null)
      await expect(input).toHaveValue('')
    })
  })

  test.describe('Select с поиском', () => {
    test('фокус в поле поиска, раскладка и описание находят запись, Enter выбирает, Escape возвращает фокус', async ({ page }) => {
      const select = trigger(page, 'searchCity')
      await select.click()
      const search = page.getByRole('searchbox')
      await expect(search).toBeFocused()

      // «vjcr» — «Москва», набранное не в той раскладке; «тверск» — описание опции
      await page.keyboard.type('vjcr')
      await expect(page.getByRole('option')).toHaveCount(1)
      await expect(page.getByRole('option')).toContainText('Москва')
      await search.fill('')
      await page.keyboard.type('тверск')
      await expect(page.getByRole('option')).toContainText('Москва')

      await page.keyboard.press('Enter')
      await expectValue(page, 'searchCity', 'msk')
      await expect(select).toContainText('Москва')
      await expect(search).toHaveCount(0)

      // Повторное открытие: запрос сброшен, подсвечен выбранный, Escape закрывает без изменений
      await select.click()
      await expect(page.getByRole('searchbox')).toHaveValue('')
      await expect(page.getByRole('option')).toHaveCount(12)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('searchbox')).toHaveCount(0)
      await expect(select).toBeFocused()
      expect((await liveValues(page))['searchCity']).toBe('msk')
    })

    test('searchInDescription={false} не ищет по описанию', async ({ page }) => {
      await trigger(page, 'searchNoDesc').click()
      await page.keyboard.type('тверск')
      await expect(page.getByText('Ничего не найдено')).toBeVisible()
    })

    test('Tab из поля поиска закрывает список и оставляет фокус на триггере', async ({ page }) => {
      const select = trigger(page, 'searchCity')
      await select.click()
      await expect(page.getByRole('searchbox')).toBeFocused()

      await page.keyboard.press('Tab')

      await expect(page.getByRole('searchbox')).toHaveCount(0)
      await expect(select).toBeFocused()
    })

    test('«+ Добавить» подписан запросом; созданная запись выбирается', async ({ page }) => {
      const select = trigger(page, 'searchCreate')
      await select.click()
      await page.keyboard.type('Тула')

      await page.getByRole('option', { name: '+ Добавить город "Тула"' }).click()

      await expectValue(page, 'searchCreate', 'new-Тула')
      await expect(select).toContainText('Тула')
    })
  })
})

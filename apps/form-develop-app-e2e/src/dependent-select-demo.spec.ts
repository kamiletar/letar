import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * Зависимые селекты (этап З, `libs/forms/PLAN.md` §18): `dependsOn` у `Field.Select`/`Field.Combobox`.
 * Каждая секция страницы — своя форма с одними и теми же именами полей, поэтому все локаторы скоупятся на секцию.
 */
test.describe('Dependent Select Demo', () => {
  const section = (page: Page, id: string) => page.getByTestId(`section-${id}`)
  const field = (page: Page, sectionId: string, name: string) =>
    section(page, sectionId).locator(`[data-field-name="${name}"]`)
  /** Инпут Combobox: `data-field-name` стоит на обёртке */
  const combo = (page: Page, sectionId: string, name: string) => field(page, sectionId, name).getByRole('combobox')

  async function pick(page: Page, sectionId: string, name: string, option: string) {
    await field(page, sectionId, name).click()
    await page.getByRole('option', { name: option, exact: true }).click()
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/dependent-select-demo')
    await section(page, 'chain').locator('form').waitFor()
  })

  test.describe('страна → регион → город', () => {
    test('пока родитель не выбран, зависимые поля заблокированы, город не запрашивается', async ({ page }) => {
      await expect(field(page, 'chain', 'regionId').getByRole('combobox')).toBeDisabled()
      await expect(section(page, 'chain').getByText('Сначала выберите «Страна»').first()).toBeVisible()
      await expect(combo(page, 'chain', 'cityId')).toBeDisabled()
      await expect(page.getByTestId('city-requests').first()).toHaveText('Запросов городов: 0')
    })

    test('выбор страны разблокирует регион, выбор региона — город', async ({ page }) => {
      await pick(page, 'chain', 'countryId', 'Россия')
      await pick(page, 'chain', 'regionId', 'Москва')
      await expect(field(page, 'chain', 'regionId')).toContainText('Москва')

      await expect(combo(page, 'chain', 'cityId')).toBeEnabled()
      await combo(page, 'chain', 'cityId').click()
      await expect(page.getByRole('option').first()).toBeVisible()
    })

    test('смена страны очищает регион и город; запрос городов при пустом регионе не уходит', async ({ page }) => {
      await pick(page, 'chain', 'countryId', 'Россия')
      await pick(page, 'chain', 'regionId', 'Москва')
      await combo(page, 'chain', 'cityId').click()
      await page.getByRole('option').first().click()
      await expect(combo(page, 'chain', 'cityId')).toHaveValue(/.+/)

      // Дебаунс поиска после выбора (300 мс) отправляет свой запрос — дожидаемся, пока счётчик устоится
      await page.waitForTimeout(700)
      const requestsBefore = await page.getByTestId('city-requests').first().innerText()
      await pick(page, 'chain', 'countryId', 'Германия')

      await expect(field(page, 'chain', 'regionId')).not.toContainText('Москва')
      await expect(combo(page, 'chain', 'cityId')).toBeDisabled()
      await expect(combo(page, 'chain', 'cityId')).toHaveValue('')
      // Регион пуст — поле городов не запрашивает ничего
      await expect(page.getByTestId('city-requests').first()).toHaveText(requestsBefore)
    })

    test('очистка объявляется вежливой live-областью на поле', async ({ page }) => {
      await pick(page, 'chain', 'countryId', 'Россия')
      await pick(page, 'chain', 'regionId', 'Москва')
      await pick(page, 'chain', 'countryId', 'Франция')

      await expect(section(page, 'chain').getByText(/очищено: изменилось поле «Страна»/).first()).toBeAttached()
    })

    test('быстрая смена страны: показан список последней страны, а не запоздавшей предыдущей', async ({ page }) => {
      await page.route('**/api/dependent-geo?kind=regions&parent=RU*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1200))
        await route.continue()
      })

      await pick(page, 'chain', 'countryId', 'Россия')
      await pick(page, 'chain', 'countryId', 'Германия')

      await field(page, 'chain', 'regionId').click()
      await expect(page.getByRole('option', { name: 'Берлин' })).toBeVisible()
      await page.waitForTimeout(1500)
      await expect(page.getByRole('option', { name: 'Москва' })).toHaveCount(0)
    })
  })

  test.describe('форма редактирования с черновиком', () => {
    test('значения заданы сразу; черновик после перезагрузки восстанавливается без стирания зависимых полей', async ({ page }) => {
      await page.evaluate(() => localStorage.clear())
      await page.reload()
      await section(page, 'edit').locator('form').waitFor()

      await expect(field(page, 'edit', 'countryId')).toContainText('Россия')
      await expect(field(page, 'edit', 'regionId')).toContainText('Москва')
      await expect(combo(page, 'edit', 'cityId')).toHaveValue(/.+/)

      // Меняем только город: страна и регион остаются, значит, зависимые поля не очищаются
      await combo(page, 'edit', 'cityId').fill('Зеленоград')
      await page.getByRole('option', { name: 'Зеленоград', exact: true }).click()
      await expect(combo(page, 'edit', 'cityId')).toHaveValue('Зеленоград')
      await page.waitForTimeout(400)

      await page.reload()
      await section(page, 'edit').locator('form').waitFor()
      await page.getByRole('button', { name: 'Восстановить' }).click()

      await expect(field(page, 'edit', 'countryId')).toContainText('Россия')
      await expect(field(page, 'edit', 'regionId')).toContainText('Москва')
      await expect(combo(page, 'edit', 'cityId')).toHaveValue('Зеленоград')
    })
  })

  test.describe('компания → сотрудник (ZenStack)', () => {
    test('поиск идёт по выбранной компании, окно создания получает компанию из deps', async ({ page }) => {
      const suffix = Date.now()
      const company = `Компания-${suffix}`
      const employee = `Сотрудник-${suffix}`

      // Своя компания с одним сотрудником: БД общая для параллельных прогонов
      await page.evaluate(async (name) => {
        await fetch('/api/model/company/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ data: { name, employees: { create: [{ name: 'Иван Первый' }] } } }),
        })
      }, company)
      await page.reload()
      await section(page, 'company').locator('form').waitFor()

      await expect(combo(page, 'company', 'employeeId')).toBeDisabled()
      await pick(page, 'company', 'companyId', company)

      await expect(combo(page, 'company', 'employeeId')).toBeEnabled()
      await combo(page, 'company', 'employeeId').click()
      await expect(page.getByRole('option', { name: 'Иван Первый' })).toBeVisible()

      await combo(page, 'company', 'employeeId').fill(employee)
      page.once('dialog', (dialog) => void dialog.accept(employee))
      await page.getByRole('option', { name: /Добавить/ }).click()

      await expect(combo(page, 'company', 'employeeId')).toHaveValue(employee)
      await expect(page.getByTestId('created-for')).not.toHaveText('Окно создания получило компанию: —')
    })
  })

  test.describe('строки массива: dependsOn="/countryId"', () => {
    test('регион остановки зависит от страны вне строки; смена страны очищает регионы во всех строках', async ({ page }) => {
      const rowRegions = section(page, 'rows').locator('[data-field-name$="regionId"]')
      await expect(rowRegions).toHaveCount(2)
      await expect(rowRegions.first()).toContainText('Москва')
      await expect(rowRegions.nth(1)).toContainText('Санкт-Петербург')

      await pick(page, 'rows', 'countryId', 'Германия')

      await expect(rowRegions.first()).not.toContainText('Москва')
      await expect(rowRegions.nth(1)).not.toContainText('Санкт-Петербург')
    })

    test('перетаскивание строки мышью меняет порядок и не стирает регионы', async ({ page }) => {
      const rowRegions = section(page, 'rows').locator('[data-field-name$="regionId"]')
      const handles = section(page, 'rows').locator('[aria-roledescription="sortable"]')
      await expect(handles).toHaveCount(2)

      const from = await handles.first().boundingBox()
      const to = await handles.nth(1).boundingBox()
      await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2)
      await page.mouse.down()
      // PointerSensor начинает перетаскивание после 8 px — двигаем несколькими шагами
      await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2 + 30, { steps: 12 })
      await page.mouse.up()

      await expect(rowRegions.first()).toContainText('Санкт-Петербург')
      await expect(rowRegions.nth(1)).toContainText('Москва')
    })
  })
})

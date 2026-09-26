import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * ZenStack + справочник: onCreate/onUpdate/useSelected/loading на настоящих хуках
 * (`useFindMany*`/`useCreate*`/`useUpdate*` поверх TanStack Query, модель Category).
 * Имена уникальны — БД общая для параллельных прогонов.
 */
test.describe('ZenStack Option Demo', () => {
  const field = (page: Page, name: string) => page.locator(`[data-field-name="${name}"]`)
  /** Инпут Combobox: `data-field-name` стоит на обёртке, не на нём */
  const combo = (page: Page, name: string) => field(page, name).getByRole('combobox')

  test.beforeEach(async ({ page }) => {
    await page.goto('/zenstack-option-demo')
    await page.locator('form').waitFor()
  })

  test('создание из Select: запись выбрана, дубля нет', async ({ page }) => {
    const name = `Создана-${Date.now()}`
    page.once('dialog', (dialog) => void dialog.accept(name))

    await field(page, 'selectCategory').click()
    await page.getByRole('option', { name: /Добавить/ }).click()

    await expect(field(page, 'selectCategory')).toContainText(name)
    await field(page, 'selectCategory').click()
    await expect(page.getByRole('option', { name })).toHaveCount(1)
  })

  test('правка F2: подпись в триггере новая, после update — один findMany справочника', async ({ page }) => {
    const first = `Правка-${Date.now()}`
    const renamed = `${first}-новая`
    page.once('dialog', (dialog) => void dialog.accept(first))
    await field(page, 'selectCategory').click()
    await page.getByRole('option', { name: /Добавить/ }).click()
    await expect(field(page, 'selectCategory')).toContainText(first)

    const listRequests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      // Запрос справочника Select — без `where` (запросы Combobox с поиском несут `where`)
      if (url.includes('/api/model/category/findMany') && !decodeURIComponent(url).includes('"where"')) {
        listRequests.push(url)
      }
    })

    page.once('dialog', (dialog) => void dialog.accept(renamed))
    await field(page, 'selectCategory').focus()
    await page.keyboard.press('F2')

    await expect(field(page, 'selectCategory')).toContainText(renamed)
    expect(listRequests).toHaveLength(1)
  })

  test('Combobox: подпись значения вне выдачи приходит из useSelected', async ({ page }) => {
    const name = `Комбо-${Date.now()}`
    page.once('dialog', (dialog) => void dialog.accept(name))
    await field(page, 'selectCategory').click()
    await page.getByRole('option', { name: /Добавить/ }).click()
    await expect(field(page, 'selectCategory')).toContainText(name)

    // «Открыть с выбранной последней категорией» перемонтирует форму со значением в обоих полях
    await page.getByRole('button', { name: /Открыть с выбранной/ }).click()
    await expect(combo(page, 'comboCategory')).toHaveValue(/.+/)
  })

  test('@letar/forms-query: Combobox через fromSearchQuery/fromSelectedQuery — список и подпись значения', async ({ page }) => {
    const name = `Query-${Date.now()}`
    page.once('dialog', (dialog) => void dialog.accept(name))
    await field(page, 'selectCategory').click()
    await page.getByRole('option', { name: /Добавить/ }).click()
    await expect(field(page, 'selectCategory')).toContainText(name)

    await page.getByRole('button', { name: /Открыть с выбранной/ }).click()
    await expect(combo(page, 'queryCategory')).toHaveValue(/.+/)
    await combo(page, 'queryCategory').click()
    await expect(page.getByRole('option').first()).toBeVisible()
  })

  test('loadOptions по fetch: запрос только после открытия списка, выбор, подпись значения', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (request) => {
      if (
        request.url().includes('/api/model/category/findMany')
        && decodeURIComponent(request.url()).includes('"take":20')
      ) {
        requests.push(request.url())
      }
    })
    const load = combo(page, 'loadCategory')
    await page.waitForTimeout(500)
    const before = requests.length

    await load.click()
    const option = page.getByRole('option').first()
    await expect(option).toBeVisible()
    expect(requests.length).toBeGreaterThan(before)

    const label = (await option.innerText()).trim()
    await option.click()
    await expect(load).toHaveValue(label)
  })

  test('loadOptions: сбой запроса — «Не удалось загрузить» и «Повторить» повторяет запрос', async ({ page }) => {
    let failing = true
    await page.route('**/api/model/category/findMany*', async (route) => {
      if (failing && decodeURIComponent(route.request().url()).includes('"take":20')) {
        await route.abort()
        return
      }
      await route.continue()
    })
    await combo(page, 'loadCategory').click()
    await expect(page.getByText('Не удалось загрузить')).toBeVisible()

    failing = false
    await page.getByRole('button', { name: 'Повторить' }).click()
    await expect(page.getByText('Не удалось загрузить')).toHaveCount(0)
    await expect(page.getByRole('option').first()).toBeVisible()
  })

  test.describe('оптимистичный режим (§16.7)', () => {
    const trigger = (page: Page) => page.getByRole('combobox', { name: /оптимистичный режим/ })

    /** Пункт «+ Добавить…» оптимистичного Select и закрытие окна приложения с названием */
    async function createOptimistically(page: Page, name: string) {
      page.once('dialog', (dialog) => void dialog.accept(name))
      await field(page, 'optimisticCategory').click()
      await page.getByRole('option', { name: /Добавить/ }).click()
    }

    test('запись видна и выбрана до ответа сервера; отправка ждёт и уходит с настоящим id', async ({ page }) => {
      const name = `Оптимист-${Date.now()}`
      await page.route('**/api/model/category/create*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        await route.continue()
      })

      await createOptimistically(page, name)
      // Сервер ещё молчит: подпись уже в поле, поле занято
      await expect(field(page, 'optimisticCategory')).toContainText(name)
      await expect(trigger(page)).toHaveAttribute('aria-busy', 'true')

      await page.getByRole('button', { name: 'Отправить' }).click()
      // После ответа отправка уходит с настоящим id, а не с временным
      const preview = page.getByText(/"optimisticCategory"/)
      await expect(preview).toBeVisible({ timeout: 10_000 })
      await expect(preview).not.toContainText('__letar_pending')
      await expect(trigger(page)).not.toHaveAttribute('aria-busy', 'true')
    })

    test('отказ сервера (500): значение возвращается, под полем сообщение', async ({ page }) => {
      const name = `Отказ-${Date.now()}`
      await page.route('**/api/model/category/create*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500))
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom' }) })
      })

      await createOptimistically(page, name)
      await expect(field(page, 'optimisticCategory')).toContainText(name)

      await expect(page.locator('[data-field-name="optimisticCategory"]').locator('..').getByRole('status'))
        .toBeVisible()
      await expect(field(page, 'optimisticCategory')).not.toContainText(name)
    })
  })
})

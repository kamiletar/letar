import { expect, type Page, test } from '@playwright/test'

/**
 * Церемония входа на главную (KM-030): тайминг, пропуск, финальный кадр без JS и при reduced-motion.
 * Часы церемонии и конец ловим по атрибутам `<html>`: `data-kami-entry-run` ставится на старте
 * часов, `data-kami-entry` снимается в конце. В скрытой панели Claude Browser rAF не идёт —
 * проверка только через Playwright.
 */

/** Фиксирует моменты старта и конца церемонии и сдвиг раскладки до начала теста. */
async function installProbe(page: Page, mode: 'full' | 'short' = 'full') {
  await page.addInitScript((flag) => {
    const probe = { run: null as number | null, end: null as number | null, skipAt: null as number | null, cls: 0 }
    ;(window as unknown as { __entry: typeof probe }).__entry = probe
    if (flag === 'short') {
      // Решение «полная или короткая» принимает ранний скрипт; здесь подменяем его результат.
      const set = Element.prototype.setAttribute
      Element.prototype.setAttribute = function(name: string, value: string) {
        return set.call(this, name, name === 'data-kami-entry' && value === 'full' ? 'short' : value)
      }
    }
    // Момент жеста пропуска: от него считаем время до финального кадра, не завися от задержек Playwright.
    const markSkip = () => {
      probe.skipAt ??= performance.now()
    }
    window.addEventListener('click', markSkip, true)
    window.addEventListener('keydown', markSkip, true)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!entry.hadRecentInput) { probe.cls += entry.value }
      }
    }).observe({ type: 'layout-shift', buffered: true })
    const attach = () => {
      const root = document.documentElement
      if (!root) { return false }
      new MutationObserver(() => {
        if (root.dataset.kamiEntryRun && probe.run === null) { probe.run = performance.now() }
        if (!root.dataset.kamiEntry && probe.run !== null && probe.end === null) { probe.end = performance.now() }
      }).observe(root, { attributes: true })
      return true
    }
    if (!attach()) {
      const wait = new MutationObserver(() => {
        if (attach()) { wait.disconnect() }
      })
      wait.observe(document, { childList: true })
    }
  }, mode)
}

const readProbe = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __entry: { run: number | null; end: number | null; cls: number } }).__entry
  )

const waitForEnd = (page: Page) =>
  page.waitForFunction(
    () => (window as unknown as { __entry: { end: number | null } }).__entry.end !== null,
    null,
    { timeout: 15_000 },
  )

const waitForClock = (page: Page) =>
  page.waitForFunction(() => document.documentElement.dataset.kamiEntryRun === '1', null, { timeout: 15_000 })

const finalState = (page: Page) =>
  page.evaluate(() => {
    const opacity = (selector: string) =>
      [...document.querySelectorAll(selector)].map((el) => Number(getComputedStyle(el).opacity))
    return {
      attr: document.documentElement.dataset.kamiEntry ?? null,
      letters: opacity('[data-entry-letter]'),
      role: opacity('[data-entry-role]'),
      menu: opacity('[data-entry-menu]'),
    }
  })

test.describe('Церемония входа на главной', () => {
  // Замеры времени чувствительны к нагрузке: параллельные воркеры замедляют кадры, а часы церемонии идут по кадрам (поэтому тесты идут по очереди, с повтором).
  test.describe.configure({ mode: 'default', retries: 2 })

  test.describe('со скриптами и движением', () => {
    test('6.1 — полная версия: 4,2 ± 0,3 с, без сдвига раскладки', async ({ page }) => {
      await installProbe(page)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/')
      await waitForEnd(page)
      const probe = await readProbe(page)
      const seconds = ((probe.end ?? 0) - (probe.run ?? 0)) / 1000
      expect(seconds).toBeGreaterThan(3.9)
      expect(seconds).toBeLessThan(4.5)
      expect(probe.cls).toBeLessThan(.1)
      const state = await finalState(page)
      expect(state.attr).toBeNull()
      expect([...state.letters, ...state.role, ...state.menu].every((value) => value === 1)).toBe(true)
    })

    test('6.2 — короткая версия: 1,5 ± 0,2 с', async ({ page }) => {
      await installProbe(page, 'short')
      await page.goto('/')
      await waitForEnd(page)
      const probe = await readProbe(page)
      const seconds = ((probe.end ?? 0) - (probe.run ?? 0)) / 1000
      expect(seconds).toBeGreaterThan(1.3)
      expect(seconds).toBeLessThan(1.7)
    })

    test('6.3 — boot-лог печатается с реальными статусами, имя собирается раньше меню', async ({ page }) => {
      await installProbe(page)
      await page.goto('/')
      await waitForClock(page)
      await expect(page.locator('[data-entry-log] div').filter({ hasText: /^глифы … ok/ })).toBeVisible({
        timeout: 4000,
      })
      await expect(page.locator('[data-entry-log]')).toContainText('шрифты … ok')
      await waitForEnd(page)
    })

    for (const how of ['кнопка', 'Escape', 'клик по пустому месту'] as const) {
      test(`6.4 — пропуск (${how}): финальный кадр за ≤0,6 с и без перехода по ссылке`, async ({ page }) => {
        await installProbe(page)
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto('/')
        await waitForClock(page)
        await page.waitForTimeout(900)
        const before = page.url()
        if (how === 'кнопка') { await page.getByRole('button', { name: /Пропустить|Skip/ }).click() }
        if (how === 'Escape') { await page.keyboard.press('Escape') }
        if (how === 'клик по пустому месту') { await page.mouse.click(1000, 600) }
        await waitForEnd(page)
        const probe = await readProbe(page)
        expect(((probe.end ?? 0) - (probe.skipAt ?? 0)) / 1000).toBeLessThan(.6)
        expect(page.url()).toBe(before)
      })
    }

    test('6.5 — клик по пункту меню во время церемонии не переходит, после — переходит', async ({ page }) => {
      await installProbe(page)
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/')
      await waitForClock(page)
      await page.waitForTimeout(1000)
      const item = page.locator('[data-testid="home-menu"] nav a').nth(1)
      await item.click({ force: true })
      await waitForEnd(page)
      await expect(page).not.toHaveURL(/about/)
      await item.click()
      await expect(page).toHaveURL(/about/)
    })

    test('6.6 — скринридеру остаётся цельный h1, слои церемонии скрыты', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: 'Kami' })).toBeAttached()
      await expect(page.locator('[data-entry-log]')).toHaveAttribute('aria-hidden', 'true')
      await expect(page.locator('h1 [data-entry-letter]').first()).toBeAttached()
      const hiddenLetters = await page.evaluate(() =>
        document.querySelector('[data-entry-letter]')?.closest('[aria-hidden="true"]') !== null
      )
      expect(hiddenLetters).toBe(true)
    })
  })

  test.describe('reduced-motion', () => {
    test.use({ reducedMotion: 'reduce' })
    test('6.7 — сразу финальный кадр, часы не запускаются', async ({ page }) => {
      await page.goto('/')
      await page.waitForTimeout(800)
      const state = await finalState(page)
      expect(state.attr).toBeNull()
      expect([...state.letters, ...state.role, ...state.menu].every((value) => value === 1)).toBe(true)
      await expect(page.getByRole('button', { name: /Пропустить|Skip/ })).toHaveCount(0)
    })
  })

  test.describe('без JavaScript', () => {
    test.use({ javaScriptEnabled: false })
    test('6.8 — меню, имя и роль видны в финальном кадре', async ({ page }) => {
      await page.goto('/')
      const state = await finalState(page)
      expect(state.attr).toBeNull()
      expect([...state.letters, ...state.role, ...state.menu].every((value) => value === 1)).toBe(true)
    })
  })
})

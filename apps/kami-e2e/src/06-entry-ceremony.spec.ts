import { expect, type Page, test } from '@playwright/test'
import { confirmLanguage, markEntrySeen, waitForClock } from './support/entry'

/**
 * Церемония входа на главную (KM-030, KM-039): экран языка, тайминг, пропуск, финальный кадр без JS и при
 * reduced-motion. Часы церемонии и конец ловим по атрибутам `<html>`: `data-kami-entry-run` ставится на старте
 * часов (после выбора языка), `data-kami-entry` снимается в конце. В скрытой панели Claude Browser rAF не идёт —
 * проверка только через Playwright.
 */

/** Фиксирует моменты старта и конца церемонии и сдвиг раскладки до начала теста. */
async function installProbe(page: Page, mode: 'full' | 'short' = 'full') {
  // Короткая версия — настоящая: флаг «вход уже показывали» читает ранний скрипт.
  if (mode === 'short') { await markEntrySeen(page) }
  await page.addInitScript(() => {
    const probe = { run: null as number | null, end: null as number | null, skipAt: null as number | null, cls: 0 }
    ;(window as unknown as { __entry: typeof probe }).__entry = probe
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
  })
}

const readProbe = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __entry: { run: number | null; end: number | null; skipAt: number | null; cls: number } })
      .__entry
  )

/** Сбрасывает момент жеста: Enter на экране языка не считается пропуском. */
const resetSkip = (page: Page) =>
  page.evaluate(() => {
    ;(window as unknown as { __entry: { skipAt: number | null } }).__entry.skipAt = null
  })

const waitForEnd = (page: Page) =>
  page.waitForFunction(
    () => (window as unknown as { __entry: { end: number | null } }).__entry.end !== null,
    null,
    { timeout: 15_000 },
  )

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
    test('6.1 — полная версия после выбора языка: 5,6 ± 0,3 с, без сдвига раскладки', async ({ page }) => {
      await installProbe(page)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/')
      await confirmLanguage(page)
      await waitForEnd(page)
      const probe = await readProbe(page)
      const seconds = ((probe.end ?? 0) - (probe.run ?? 0)) / 1000
      expect(seconds).toBeGreaterThan(5.3)
      expect(seconds).toBeLessThan(5.9)
      expect(probe.cls).toBeLessThan(.1)
      const state = await finalState(page)
      expect(state.attr).toBeNull()
      expect([...state.letters, ...state.role, ...state.menu].every((value) => value === 1)).toBe(true)
    })

    test('6.2 — короткая версия: 1,5 ± 0,2 с, экрана языка нет', async ({ page }) => {
      await installProbe(page, 'short')
      await page.goto('/')
      await expect(page.locator('[data-entry-language]')).toBeHidden()
      await waitForEnd(page)
      const probe = await readProbe(page)
      const seconds = ((probe.end ?? 0) - (probe.run ?? 0)) / 1000
      expect(seconds).toBeGreaterThan(1.3)
      expect(seconds).toBeLessThan(1.7)
    })

    test('6.3 — boot-лог печатается по расписанию: строки с ok, полоса прогресса, без «позже»', async ({ page }) => {
      await installProbe(page)
      await page.goto('/')
      await confirmLanguage(page)
      const log = page.locator('[data-entry-log]')
      await expect(log.locator('div').filter({ hasText: /^глифы … ok/ })).toBeVisible({ timeout: 4000 })
      await expect(log).toContainText('шрифты … ok')
      await expect(log).toContainText('язык … ru')
      await expect(log.locator('[data-entry-bar]')).toContainText(/\[█*░*\] \d+%/)
      await expect(log).not.toContainText(/позже|later/i)
      await waitForEnd(page)
    })

    for (const how of ['Escape', 'клик по пустому месту'] as const) {
      test(`6.4 — пропуск (${how}): финальный кадр за ≤0,6 с, без перехода, кнопки «Пропустить» нет`, async ({ page }) => {
        await installProbe(page)
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto('/')
        await confirmLanguage(page)
        await page.waitForTimeout(900)
        await resetSkip(page)
        const before = page.url()
        if (how === 'Escape') { await page.keyboard.press('Escape') }
        else { await page.mouse.click(1000, 600) }
        await waitForEnd(page)
        const probe = await readProbe(page)
        expect(((probe.end ?? 0) - (probe.skipAt ?? 0)) / 1000).toBeLessThan(.6)
        expect(page.url()).toBe(before)
        await expect(page.getByRole('button', { name: /Пропустить|Skip/ })).toHaveCount(0)
      })
    }

    test('6.5 — клик по пункту меню во время церемонии не переходит, после — переходит', async ({ page }) => {
      await installProbe(page)
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/')
      await confirmLanguage(page)
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
      await expect(page.locator('[aria-hidden="true"] [data-entry-log]')).toBeAttached()
      await expect(page.locator('h1 [data-entry-letter]').first()).toBeAttached()
      const hiddenLetters = await page.evaluate(() =>
        document.querySelector('[data-entry-letter]')?.closest('[aria-hidden="true"]') !== null
      )
      expect(hiddenLetters).toBe(true)
    })

    test('6.9 — экран языка: часы стоят до выбора, стрелки меняют пункт, Enter запускает загрузку', async ({ page }) => {
      await installProbe(page)
      await page.goto('/')
      const dialog = page.locator('[data-entry-language]')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('radio', { name: /Русский/ })).toHaveAttribute('aria-checked', 'true')
      await page.waitForTimeout(1500)
      expect((await readProbe(page)).run).toBeNull()
      await expect(page.locator('html')).toHaveAttribute('data-kami-entry', 'full')
      await expect(async () => {
        await page.keyboard.press('ArrowDown')
        await expect(dialog.getByRole('radio', { name: /English/ })).toHaveAttribute('aria-checked', 'true', {
          timeout: 500,
        })
      }).toPass({ timeout: 10_000 })
      await page.keyboard.press('ArrowUp')
      await expect(dialog.getByRole('radio', { name: /Русский/ })).toHaveAttribute('aria-checked', 'true')
      await page.keyboard.press('Enter')
      await waitForClock(page)
      await expect(dialog).toBeHidden()
      await waitForEnd(page)
    })

    test('6.10 — выбор English переносит вход на /en/ без второго экрана языка', async ({ page }) => {
      await installProbe(page)
      await page.goto('/')
      await expect(page.locator('[data-entry-language]')).toBeVisible()
      await expect(async () => {
        await page.locator('[data-entry-language] [data-language="en"]').click()
        await expect(page).toHaveURL(/\/en\/$/, { timeout: 1000 })
      }).toPass({ timeout: 15_000 })
      await waitForClock(page)
      await expect(page.locator('[data-entry-language]')).toBeHidden()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await waitForEnd(page)
      await expect(page.locator('[data-testid="home-menu"] nav a').first()).toContainText(/Order a website/i)
    })

    test('6.11 — Escape на экране языка сразу даёт финальный кадр', async ({ page }) => {
      await installProbe(page)
      await page.goto('/')
      await expect(page.locator('[data-entry-language]')).toBeVisible()
      await expect(async () => {
        await page.keyboard.press('Escape')
        await page.waitForFunction(() => !document.documentElement.dataset.kamiEntry, null, { timeout: 1000 })
      }).toPass({ timeout: 15_000 })
      await expect(page.locator('[data-entry-language]')).toBeHidden()
      const state = await finalState(page)
      expect([...state.letters, ...state.role, ...state.menu].every((value) => value === 1)).toBe(true)
    })
  })

  test.describe('reduced-motion', () => {
    test.use({ reducedMotion: 'reduce' })
    test('6.7 — сразу финальный кадр, экрана языка и часов нет', async ({ page }) => {
      await page.goto('/')
      await page.waitForTimeout(800)
      const state = await finalState(page)
      expect(state.attr).toBeNull()
      expect([...state.letters, ...state.role, ...state.menu].every((value) => value === 1)).toBe(true)
      await expect(page.locator('[data-entry-language]')).toBeHidden()
      await expect(page.getByRole('button', { name: /Пропустить|Skip/ })).toHaveCount(0)
    })
  })

  test.describe('без JavaScript', () => {
    test.use({ javaScriptEnabled: false })
    test('6.8 — меню, имя и роль видны в финальном кадре, экрана языка нет', async ({ page }) => {
      await page.goto('/')
      const state = await finalState(page)
      expect(state.attr).toBeNull()
      expect([...state.letters, ...state.role, ...state.menu].every((value) => value === 1)).toBe(true)
      await expect(page.locator('[data-entry-language]')).toBeHidden()
    })
  })
})

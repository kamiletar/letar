import { expect, type Page, test } from '@playwright/test'
import { confirmLanguage, markEntrySeen } from './support/entry'

/**
 * Правило повтора входа (KM-018, KM-039): первый заход — `full` с экраном языка, следующие заходы и reload — `short`,
 * Back/Forward и bfcache — без входа, клиентские переходы вход не играют, «Перезапустить вход»
 * проигрывает `full` без перезагрузки. Режим решает ранний скрипт; здесь его результат читаем
 * по истории значений атрибута `data-kami-entry` на `<html>`.
 */

interface Probe {
  seen: (string | null)[]
  run: number
  marker: string
}

/** Пишет в `window.__attrs` каждое значение `data-kami-entry` и число стартов часов в этом документе. */
async function installProbe(page: Page) {
  await page.addInitScript(() => {
    const probe = { seen: [] as (string | null)[], run: 0, marker: Math.random().toString(36).slice(2) }
    ;(window as unknown as { __attrs: typeof probe }).__attrs = probe
    const attach = () => {
      const root = document.documentElement
      if (!root) { return false }
      let run = false
      new MutationObserver(() => {
        const value = root.getAttribute('data-kami-entry')
        if (value !== probe.seen[probe.seen.length - 1] && value !== null) { probe.seen.push(value) }
        if (root.dataset.kamiEntryRun && !run) {
          run = true
          probe.run++
        }
        if (!root.dataset.kamiEntryRun) { run = false }
      }).observe(root, { attributes: true })
      const first = root.getAttribute('data-kami-entry')
      if (first) { probe.seen.push(first) }
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

const readProbe = (page: Page) => page.evaluate(() => (window as unknown as { __attrs: Probe }).__attrs)
const attr = (page: Page) => page.evaluate(() => document.documentElement.dataset.kamiEntry ?? null)
const seenFlag = (page: Page) => page.evaluate(() => localStorage.getItem('kami.entry.seen'))
const waitForClock = (page: Page) =>
  page.waitForFunction(() => document.documentElement.dataset.kamiEntryRun === '1', null, { timeout: 15_000 })
const waitForEnd = (page: Page) =>
  page.waitForFunction(() => !document.documentElement.dataset.kamiEntry, null, { timeout: 15_000 })
const finalState = (page: Page) =>
  page.evaluate(() => {
    const opacity = (selector: string) =>
      [...document.querySelectorAll(selector)].map((el) => Number(getComputedStyle(el).opacity))
    return [...opacity('[data-entry-letter]'), ...opacity('[data-entry-role]'), ...opacity('[data-entry-menu]')]
  })
const replay = (page: Page) => page.locator('[data-entry-replay]')

test.describe('Повтор входа на главной', () => {
  // Часы церемонии идут по кадрам, параллельные воркеры их замедляют (как в 06-entry-ceremony).
  test.describe.configure({ mode: 'default', retries: 2 })

  test.describe('со скриптами и движением', () => {
    test.beforeEach(async ({ page }) => {
      await installProbe(page)
    })

    test('8.1 — первый заход играет full и сразу ставит флаг kami.entry.seen', async ({ page }) => {
      await page.goto('/')
      expect((await readProbe(page)).seen[0]).toBe('full')
      expect(await seenFlag(page)).toBe('1')
    })

    test('8.2 — второй прямой заход и reload играют short', async ({ page }) => {
      await page.goto('/')
      await page.goto('/')
      expect((await readProbe(page)).seen[0]).toBe('short')
      await waitForEnd(page)
      await page.reload()
      expect((await readProbe(page)).seen[0]).toBe('short')
    })

    test('8.3 — уход посреди первого входа тоже считается показом', async ({ page }) => {
      await page.goto('/')
      expect(await seenFlag(page)).toBe('1')
      await page.goto('/about/')
      await page.goto('/')
      expect((await readProbe(page)).seen[0]).toBe('short')
    })

    test('8.4 — главная → /about/ полной загрузкой → Back: входа нет', async ({ page }) => {
      await markEntrySeen(page)
      await page.goto('/')
      await waitForEnd(page)
      await page.goto('/about/')
      await page.goBack()
      await expect(page).toHaveURL(/\/(ru\/)?$/)
      await expect(page.locator('[data-testid="home-menu"] nav a').first()).toBeVisible()
      await page.waitForTimeout(800)
      const probe = await readProbe(page)
      expect(probe.seen).toEqual([])
      expect(probe.run).toBe(0)
      expect(await attr(page)).toBeNull()
      expect((await finalState(page)).every((value) => value === 1)).toBe(true)
    })

    test('8.5 — Back после Forward снова на главную: входа нет', async ({ page }) => {
      await markEntrySeen(page)
      await page.goto('/')
      await waitForEnd(page)
      await page.goto('/about/')
      await page.goBack()
      await expect(page.locator('[data-testid="home-menu"] nav a').first()).toBeVisible()
      await page.goForward({ waitUntil: 'commit' })
      await expect(page).toHaveURL(/\/about\/$/)
      await page.waitForLoadState('load')
      await page.goBack()
      await page.waitForTimeout(500)
      expect((await readProbe(page)).seen).toEqual([])
    })

    test('8.6 — клиентский переход на главную по логотипу вход не играет', async ({ page }) => {
      await page.goto('/about/')
      const logo = page.locator('a[aria-label="Главная страница"]:visible').first()
      await logo.click()
      await expect(page).toHaveURL(/\/(ru\/)?$/)
      await expect(page.locator('[data-testid="home-menu"] nav a').first()).toBeVisible()
      await page.waitForTimeout(800)
      const probe = await readProbe(page)
      expect(probe.seen).toEqual([])
      expect(probe.run).toBe(0)
      expect(await attr(page)).toBeNull()
      // Документ тот же (без перезагрузки), а флаг первого показа не записан: на /about/ скрипт ничего не решает.
      expect(await seenFlag(page)).toBeNull()
      expect((await finalState(page)).every((value) => value === 1)).toBe(true)
    })

    test('8.7 — «Перезапустить вход» проигрывает full без перезагрузки и без экрана языка, во время входа скрыта', async ({ page }) => {
      await page.goto('/')
      await confirmLanguage(page)
      await expect(replay(page)).toBeHidden()
      await waitForEnd(page)
      await expect(replay(page)).toBeVisible()
      const box = await replay(page).boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      const before = await readProbe(page)
      await replay(page).click()
      await expect.poll(() => attr(page)).toBe('full')
      await waitForClock(page)
      await expect(page.locator('[data-entry-language]')).toBeHidden()
      await expect(replay(page)).toBeHidden()
      await waitForEnd(page)
      const after = await readProbe(page)
      expect(after.marker).toBe(before.marker)
      expect(after.seen.at(-1)).toBe('full')
      expect(after.run).toBe(2)
      expect((await finalState(page)).every((value) => value === 1)).toBe(true)
      await expect(replay(page)).toBeVisible()
      expect(await seenFlag(page)).toBe('1')
    })

    test('8.8 — bfcache: pageshow с persisted посреди входа сразу даёт финальный кадр', async ({ page }) => {
      await page.goto('/')
      await confirmLanguage(page)
      // Обычный pageshow без persisted ничего не меняет.
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false })))
      await page.waitForTimeout(200)
      expect(await attr(page)).toBe('full')
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
      await expect.poll(() => attr(page), { timeout: 1500 }).toBeNull()
      expect((await finalState(page)).every((value) => value === 1)).toBe(true)
      await page.waitForTimeout(1000)
      expect((await readProbe(page)).run).toBe(1)
      expect(await attr(page)).toBeNull()
    })
  })

  test.describe('метка продолжения входа после смены языка', () => {
    test('8.12 — свежая метка пропускает экран языка, старая — нет', async ({ page }) => {
      await page.addInitScript(() => {
        if (location.hash === '#fresh') { sessionStorage.setItem('kami.entry.resume', String(Date.now())) }
        if (location.hash === '#stale') { sessionStorage.setItem('kami.entry.resume', String(Date.now() - 60_000)) }
      })
      await page.goto('/en/#fresh')
      expect(await attr(page)).toBe('full')
      await expect(page.locator('html')).not.toHaveAttribute('data-kami-entry-lang', /.*/)
      await waitForClock(page)
      await page.goto('/en/#stale')
      await page.evaluate(() => localStorage.clear())
      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('data-kami-entry-lang', /.*/)
      await expect(page.locator('[data-entry-language]')).toBeVisible()
    })
  })

  test.describe('без доступа к localStorage', () => {
    test('8.9 — исключение localStorage даёт full при каждом заходе', async ({ page }) => {
      await installProbe(page)
      await page.addInitScript(() => {
        const fail = () => {
          throw new DOMException('denied', 'SecurityError')
        }
        Storage.prototype.getItem = fail
        Storage.prototype.setItem = fail
      })
      await page.goto('/')
      expect((await readProbe(page)).seen[0]).toBe('full')
      await page.goto('/')
      expect((await readProbe(page)).seen[0]).toBe('full')
    })
  })

  test.describe('reduced-motion', () => {
    test.use({ reducedMotion: 'reduce' })
    test('8.10 — финальный кадр при первом заходе, повторе и reload, кнопки повтора нет', async ({ page }) => {
      await installProbe(page)
      await page.goto('/')
      expect(await attr(page)).toBeNull()
      expect((await finalState(page)).every((value) => value === 1)).toBe(true)
      await page.goto('/')
      expect(await attr(page)).toBeNull()
      await page.reload()
      expect(await attr(page)).toBeNull()
      await page.waitForTimeout(800)
      await expect(replay(page)).toHaveCount(0)
      expect((await readProbe(page)).seen).toEqual([])
      expect(await seenFlag(page)).toBeNull()
    })
  })

  test.describe('без JavaScript', () => {
    test.use({ javaScriptEnabled: false })
    test('8.11 — кнопки повтора нет, меню на месте', async ({ page }) => {
      await page.goto('/')
      await expect(replay(page)).toHaveCount(0)
      await expect(page.locator('[data-testid="home-menu"] nav a')).toHaveCount(5)
    })
  })
})

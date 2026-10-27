import { expect, type Page } from '@playwright/test'

/**
 * Помощники для проверок входа на главной (KM-039). Первый заход показывает экран выбора языка, и часы
 * церемонии не идут, пока посетитель не подтвердит язык: тесты, которым нужна сама церемония, подтверждают его
 * здесь, а не ждут запуска сами.
 */

/** Ставит флаг «вход уже показывали»: ранний скрипт выбирает короткую версию без экрана языка. */
export async function markEntrySeen(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('kami.entry.seen', '1')
    } catch { /* без localStorage вход всё равно полный */ }
  })
}

/** Часы церемонии пошли (`data-kami-entry-run` ставит `matrix-rain.tsx` на старте). */
export const waitForClock = (page: Page) =>
  page.waitForFunction(() => document.documentElement.dataset.kamiEntryRun === '1', null, { timeout: 15_000 })

/**
 * Подтверждает выбранный язык на экране выбора (Enter) и ждёт старта часов. Нажатие повторяется, пока страница
 * не загидратирована: до гидратации слушателя клавиатуры ещё нет.
 */
export async function confirmLanguage(page: Page) {
  await expect(page.locator('[data-entry-language]')).toBeVisible()
  await expect(async () => {
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.documentElement.dataset.kamiEntryRun === '1', null, { timeout: 1000 })
  }).toPass({ timeout: 15_000 })
}

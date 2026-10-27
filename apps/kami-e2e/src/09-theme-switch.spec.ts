import { expect, type Page, test } from '@playwright/test'
import { confirmLanguage } from './support/entry'

/**
 * Смена темы без перезагрузки (KM-038): одно нажатие кнопки в шапке перекрашивает всё сразу.
 * Эталон — та же страница после reload в той же теме: computed-цвета каждого элемента совпадают.
 * Ломалось на буквенном фоне: next-themes ставит класс темы на <html> в своём эффекте, который
 * выполняется после эффектов детей, и Canvas читал цвета прежней темы.
 * В скрытой панели Claude Browser rAF не идёт — проверка только через Playwright.
 */

type Mode = 'light' | 'dark'

/** Тема задаётся как после клика пользователя (не `system`), вход пропускаем флагом «уже видел». */
async function openIn(page: Page, path: string, mode: Mode, { seen = true } = {}) {
  await page.addInitScript(([theme, skipEntry]) => {
    try {
      if (!localStorage.getItem('theme')) { localStorage.setItem('theme', theme) }
      if (skipEntry) { localStorage.setItem('kami.entry.seen', '1') }
    } catch {
      // localStorage недоступен — тема останется системной
    }
  }, [mode, seen] as const)
  await page.goto(path)
  await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${mode}\\b`))
  // Первый заход (KM-039): экран языка и вход, баннер cookie скрыт до конца входа, сравнивать нечего.
  if (!seen) { return }
  // Баннер cookie появляется после монтирования: он тоже должен попасть в сравнение.
  await expect(page.getByRole('button', { name: 'Принять все' })).toBeVisible()
  await settle(page)
}

/**
 * Ждём конец CSS-переходов и догрузку разметки: колбэки эффектов и перекраска Canvas уже выполнены,
 * число элементов на странице не меняется два замера подряд.
 */
async function settle(page: Page) {
  await page.waitForTimeout(1200)
  let last = -1
  await expect(async () => {
    const count = await page.evaluate(() => document.body.querySelectorAll('*').length)
    const stable = count === last
    last = count
    if (!stable) { await page.waitForTimeout(600) }
    expect(stable).toBe(true)
  }).toPass({ timeout: 20_000 })
}

/**
 * Нажатие кнопки темы; курсор уводим в пустое место, чтобы hover не попал в сравнение.
 * Под нагрузкой (несколько воркеров) клик может прийти до гидратации кнопки: повторяем его,
 * пока класс на `<html>` не сменится, и не кликаем второй раз после успеха.
 */
async function toggleTheme(page: Page) {
  const html = page.locator('html')
  const wasDark = /\bdark\b/.test((await html.getAttribute('class')) ?? '')
  const next = new RegExp(`\\b${wasDark ? 'light' : 'dark'}\\b`)
  await expect(async () => {
    if (!next.test((await html.getAttribute('class')) ?? '')) {
      await page.getByRole('button', { name: 'Переключить тему' }).first().click()
    }
    await expect(html).toHaveClass(next, { timeout: 1000 })
  }).toPass({ timeout: 15_000 })
  await page.mouse.move(640, 760)
  await settle(page)
}

/** Computed-цвета всех элементов `body` и средний цвет самого большого Canvas. */
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const colors: Record<string, string> = {}
    // Служебные узлы Next (объявление маршрута, портал оверлея) появляются в разное время и сдвигают индексы.
    const service = (el: Element) => ['SCRIPT', 'NEXT-ROUTE-ANNOUNCER', 'NEXTJS-PORTAL'].includes(el.tagName)
    // Ключ узла — тег, emotion-класс и порядковый номер среди таких же соседей: появление постороннего
    // узла рядом не сдвигает ключи остальных.
    const label = (el: Element) =>
      `${el.tagName.toLowerCase()}.${
        String(el.getAttribute('class') ?? '').split(' ').find((c) => c.startsWith('css-')) ?? ''
      }`
    const path = (el: Element) => {
      const parts: string[] = []
      for (let e: Element | null = el; e && e !== document.documentElement; e = e.parentElement) {
        const same = e.parentElement
          ? [...e.parentElement.children].filter((c) => !service(c) && label(c) === label(e!))
          : []
        parts.push(`${label(e)}[${same.indexOf(e)}]`)
      }
      return parts.reverse().join('>')
    }
    for (const el of document.body.querySelectorAll('*')) {
      if (service(el) || ['STYLE', 'LINK', 'META', 'NOSCRIPT'].includes(el.tagName)) { continue }
      if (el.closest('nextjs-portal')) { continue }
      const style = getComputedStyle(el)
      colors[path(el)] = [
        style.color,
        style.backgroundColor,
        style.backgroundImage,
        style.borderTopColor,
        style.fill,
        style.boxShadow,
      ].join(' | ')
    }
    const root = getComputedStyle(document.documentElement)
    colors['html'] = `${root.color} | ${root.backgroundColor} | ${root.colorScheme}`
    const canvases = [...document.querySelectorAll('canvas')]
    const canvas = canvases.sort((a, b) => b.width * b.height - a.width * a.height)[0]
    let brightness = -1
    if (canvas) {
      const probe = document.createElement('canvas')
      probe.width = 32
      probe.height = 32
      const ctx = probe.getContext('2d')
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, 32, 32)
        const data = ctx.getImageData(0, 0, 32, 32).data
        let sum = 0
        for (let i = 0; i < data.length; i += 4) { sum += (data[i] + data[i + 1] + data[i + 2]) / 3 }
        brightness = Math.round(sum / (data.length / 4))
      }
    }
    return { colors, brightness }
  })
}

/**
 * Цвета после клика совпадают с цветами после reload. Сравниваем узлы, присутствующие в обоих снимках:
 * dev-режим Next досоздаёт часть служебной разметки в разное время, и индексы соседей могут сместиться.
 * Расхождение цвета у общего узла — настоящая ошибка; узлов в общем должно быть подавляющее большинство.
 */
function expectSameColors(toggled: Record<string, string>, reloaded: Record<string, string>) {
  const common = Object.keys(reloaded).filter((key) => key in toggled)
  expect(common.length).toBeGreaterThan(Object.keys(reloaded).length * 0.85)
  const mismatches = common
    .filter((key) => toggled[key] !== reloaded[key])
    .map((key) => `${key}\n  после клика: ${toggled[key]}\n  после reload: ${reloaded[key]}`)
  expect(mismatches, mismatches.slice(0, 5).join('\n')).toEqual([])
}

/** Фон страницы — светлый (около 255) или тёмный (около 13). */
const isLightCanvas = (brightness: number) => brightness > 150

/** Ждёт, пока Canvas буквенного фона нарисован в нужной теме: под нагрузкой атлас глифов греется дольше. */
async function expectCanvas(page: Page, mode: Mode) {
  await expect.poll(async () => isLightCanvas((await snapshot(page)).brightness), { timeout: 10_000 }).toBe(
    mode === 'light',
  )
}

// Блог не берём: контент грузится из git и в dev долго показывает спиннер, сравнение получается нестабильным.
const PAGES = ['/ru/about/', '/ru/site/']

test.describe('Смена темы без перезагрузки', () => {
  for (const path of PAGES) {
    for (const from of ['light', 'dark'] as const) {
      const to = from === 'light' ? 'dark' : 'light'

      test(`9.1 — ${path}: ${from} → ${to} совпадает с reload`, async ({ page }) => {
        await openIn(page, path, from)
        await expectCanvas(page, from)
        await toggleTheme(page)
        await expectCanvas(page, to)
        const toggled = await snapshot(page)

        await page.reload()
        await expect(page.getByRole('button', { name: 'Принять все' })).toBeVisible()
        await settle(page)
        await expectCanvas(page, to)
        const reloaded = await snapshot(page)

        expectSameColors(toggled.colors, reloaded.colors)
      })
    }
  }

  test('9.2 — главная после входа: тёмная → светлая без reload', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openIn(page, '/', 'dark')
    await expectCanvas(page, 'dark')
    await toggleTheme(page)
    await expectCanvas(page, 'light')
    const toggled = await snapshot(page)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Принять все' })).toBeVisible()
    await settle(page)
    const reloaded = await snapshot(page)
    expectSameColors(toggled.colors, reloaded.colors)
  })

  test('9.3 — главная во время входа: Canvas и фон меняются при клике по теме', async ({ page }) => {
    // seen=false: первый заход, играет полная церемония. Подтверждаем язык, ждём старта часов; значки в углу
    // (в них кнопка темы) проявляются вместе с меню в конце входа — нажимаем её, пока вход ещё идёт.
    await openIn(page, '/', 'dark', { seen: false })
    await confirmLanguage(page)
    await expectCanvas(page, 'dark')
    await expect(page.getByRole('button', { name: 'Переключить тему' }).first()).toBeVisible({ timeout: 10_000 })
    await toggleTheme(page)
    await expect(page.locator('html')).toHaveClass(/\blight\b/)
    await expectCanvas(page, 'light')
    const toggled = await snapshot(page)
    expect(toggled.colors['html']).toContain('rgb(255, 255, 255)')
  })
})

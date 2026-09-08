import { expect, test } from '@playwright/test'

import {
  checkProductionBuild,
  closeElectronApp,
  getFixturesPath,
  launchElectronApp,
  stubSelectFolderDialog,
} from '@helpers/electron.helpers'

import type { ElectronTestContext } from '@helpers/electron.helpers'

/**
 * Открытие папки с сериалом → список эпизодов → выбор эпизода → появляется видео/контролы.
 *
 * ⚠️ Требует production build (`nx build:win animatrona-folder-player`) и сгенерированные
 * фикстуры (`nx fixtures:create animatrona-folder-player-e2e`).
 *
 * Слабые (`.catch(() => false)`) проверки — по образцу `apps/animatrona-e2e/src/04-player` —
 * т.к. точная разметка Shaka-плеера/сайдбара может обновляться независимо от структуры теста.
 */

test.describe('Animatrona Player — папочный режим', () => {
  let ctx: ElectronTestContext

  test.beforeAll(() => {
    test.skip(!checkProductionBuild(), 'Production build не найден — запусти "nx build:win animatrona-folder-player"')
  })

  test.afterEach(async () => {
    if (ctx) {
      await closeElectronApp(ctx)
    }
  })

  test('выбор папки открывает сайдбар с эпизодами', async () => {
    ctx = await launchElectronApp()

    const folderPath = getFixturesPath('anime-folder')
    await stubSelectFolderDialog(ctx.app, folderPath)

    await ctx.page.getByRole('button', { name: 'Выбрать папку' }).click()

    // Сканирование папки — недолго (2 коротких mkv), но даём запас на mediainfo.js (WASM).
    // Доступное имя кнопки эпизода начинается с номера без ведущего нуля ("1", не "01") —
    // getDisplayName() в EpisodeSidebar его отбрасывает.
    const firstEpisodeButton = ctx.page.locator('button', { hasText: /^\d/ }).first()
    await expect(firstEpisodeButton).toBeVisible({ timeout: 15000 })
  })

  test('клик по эпизоду запускает воспроизведение', async () => {
    ctx = await launchElectronApp()

    const folderPath = getFixturesPath('anime-folder')
    await stubSelectFolderDialog(ctx.app, folderPath)
    await ctx.page.getByRole('button', { name: 'Выбрать папку' }).click()

    const firstEpisodeButton = ctx.page.locator('button', { hasText: /^\d/ }).first()
    await expect(firstEpisodeButton).toBeVisible({ timeout: 15000 })
    await firstEpisodeButton.click()

    // Video-элемент создаётся программно внутри useShakaPlayer — ждём его появления в DOM
    const video = ctx.page.locator('video')
    await expect(video).toBeVisible({ timeout: 15000 })

    // Спиннер начальной буферизации должен исчезнуть — плеер реально начал грузить видео
    await expect
      .poll(async () => video.evaluate((el: HTMLVideoElement) => el.readyState).catch(() => -1), { timeout: 15000 })
      .toBeGreaterThanOrEqual(2)
  })
})

import { expect, test } from '@playwright/test'

import { checkProductionBuild, closeElectronApp, getAppVersion, launchElectronApp } from '@helpers/electron.helpers'

import type { ElectronTestContext } from '@helpers/electron.helpers'

/**
 * Smoke-тест: приложение запускается, показывает пустой экран "нет папки" и версия читается.
 *
 * ⚠️ Требует production build: `nx build:win animatrona-folder-player`.
 */

test.describe('Animatrona Player — запуск', () => {
  let ctx: ElectronTestContext

  test.beforeAll(() => {
    test.skip(!checkProductionBuild(), 'Production build не найден — запусти "nx build:win animatrona-folder-player"')
  })

  test.afterEach(async () => {
    if (ctx) {
      await closeElectronApp(ctx)
    }
  })

  test('открывается и показывает версию', async () => {
    ctx = await launchElectronApp()

    const version = await getAppVersion(ctx.app)
    expect(version).toMatch(/^\d+\.\d+\.\d+/)
  })

  test('без выбранной папки показывает пустой экран с кнопкой "Выбрать папку"', async () => {
    ctx = await launchElectronApp()

    await expect(ctx.page.getByText('Animatrona Player')).toBeVisible()
    await expect(ctx.page.getByRole('button', { name: 'Выбрать папку' })).toBeVisible()
  })
})

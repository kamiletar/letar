/**
 * Player тесты: клик по кадру
 *
 * Регрессионный тест на баг, который «в коде выглядел исправным»: обработчик
 * `onClick={controls.togglePlay}` висел на внешнем контейнере, а вложенный контейнер
 * video-элемента был растянут на 100%×100% и глушил событие через `stopPropagation`.
 * В результате пауза срабатывала только по чёрным полосам вокруг кадра, а по самому
 * кадру — нет. Наличие обработчика в коде такой баг не ловит, поэтому проверка только
 * настоящим кликом мыши в центр кадра.
 *
 * Проверяем:
 * - одиночный клик по кадру ставит паузу и снимает её
 * - двойной клик по кадру переключает полный экран и НЕ меняет состояние воспроизведения
 */

import { expect, test } from '@playwright/test'
import {
  checkProductionBuild,
  closeElectronApp,
  type ElectronTestContext,
  getTestVideoPath,
  launchElectronApp,
  stubOpenFileDialog,
  waitForMainWindow,
} from '../../helpers/electron.helpers'

let ctx: ElectronTestContext

/** Состояние video-элемента в renderer */
async function getVideoState(context: ElectronTestContext) {
  return context.page.evaluate(() => {
    const video = document.querySelector('video')
    return {
      exists: !!video,
      paused: video?.paused ?? null,
      readyState: video?.readyState ?? 0,
      isFullscreen: !!document.fullscreenElement,
    }
  })
}

/**
 * Открыть видеофайл в плеере и дождаться готовности video-элемента.
 *
 * Молчаливых `test.skip()` здесь нет намеренно: если UI не нашёлся — это провал теста, а не
 * повод его пропустить. Единственный законный скип — отсутствие production-билда (beforeAll).
 */
async function openVideoInPlayer(context: ElectronTestContext): Promise<void> {
  await stubOpenFileDialog(context.app, [getTestVideoPath('sample-5s.mkv')])

  // ⚠️ Пункты сайдбара — Box as="button", а НЕ ссылки (Sidebar.tsx: router.push в onClick).
  // Соседние спеки ищут getByRole('link') и из-за этого молча скипаются целиком
  const nav = context.page.getByRole('navigation')
  await nav.getByRole('button', { name: /плеер/i }).click()

  // ⚠️ Ожидание через toBeVisible, а не isVisible(): isVisible возвращает результат
  // немедленно и на непрогрузившемся UI даёт false — ровно из-за этого тест раньше скипался
  const selectFileBtn = context.page.getByRole('button', { name: /выбрать файл/i })
  await expect(selectFileBtn).toBeVisible({ timeout: 20000 })
  await selectFileBtn.click()

  // Ждём, пока video получит метаданные — до этого клик по кадру бессмыслен
  await expect
    .poll(async () => (await getVideoState(context)).readyState, { timeout: 30000, intervals: [500] })
    .toBeGreaterThan(0)
}

/** Привести плеер в состояние «играет» (это подготовка, а не проверка) */
async function ensurePlaying(context: ElectronTestContext): Promise<void> {
  await context.page.evaluate(async () => {
    const video = document.querySelector('video')
    if (video) {
      video.muted = true
      await video.play().catch(() => {
        /* прерванный play — не ошибка */
      })
    }
  })

  await expect.poll(async () => (await getVideoState(context)).paused, { timeout: 10000 }).toBe(false)
}

test.describe('Player: клик по кадру', () => {
  test.beforeAll(() => {
    if (!checkProductionBuild()) {
      test.skip()
      console.log('Skipping Electron tests: production build not found')
    }
  })

  test.beforeEach(async () => {
    ctx = await launchElectronApp()
    await waitForMainWindow(ctx, 60000)
  })

  test.afterEach(async () => {
    await closeElectronApp(ctx)
  })

  test('одиночный клик по центру кадра ставит паузу и снимает её', async () => {
    await openVideoInPlayer(ctx)
    await ensurePlaying(ctx)

    // Клик именно по video-элементу: центр кадра, а не чёрные полосы вокруг.
    // force не используем намеренно — Playwright проверяет, что клик реально долетает
    // до элемента, а не перехватывается оверлеем сверху
    const video = ctx.page.locator('video')
    await video.click()

    await expect.poll(async () => (await getVideoState(ctx)).paused, { timeout: 5000 }).toBe(true)

    // Повторный клик снимает паузу
    await video.click()

    await expect.poll(async () => (await getVideoState(ctx)).paused, { timeout: 5000 }).toBe(false)
  })

  test('двойной клик по кадру включает полный экран и не сбивает воспроизведение', async () => {
    await openVideoInPlayer(ctx)
    await ensurePlaying(ctx)

    const video = ctx.page.locator('video')
    await video.dblclick()

    await expect.poll(async () => (await getVideoState(ctx)).isFullscreen, { timeout: 5000 }).toBe(true)

    // Двойной клик не должен оставлять видео на паузе: первый click двойного её ставит,
    // а обработчик двойного клика откатывает
    await expect.poll(async () => (await getVideoState(ctx)).paused, { timeout: 5000 }).toBe(false)

    // Второй двойной клик возвращает из полного экрана
    await video.dblclick()

    await expect.poll(async () => (await getVideoState(ctx)).isFullscreen, { timeout: 5000 }).toBe(false)
  })
})

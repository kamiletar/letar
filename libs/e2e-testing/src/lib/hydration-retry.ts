import type { Locator } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Кликает по элементу и ждёт условия, устойчиво к гонке гидратации React.
 *
 * Гонка (найдено 2026-07-29, archetest): controlled-компонент (например Chakra
 * `Checkbox.Root` с `checked={...}`) навешивает обработчик (`onCheckedChange`) только
 * во время гидратации. Если клик по нативному элементу физически происходит ДО этого
 * момента, он теряется: браузер визуально/нативно переключает состояние, но React при
 * следующем рендере откатывает его назад к устаревшему значению — `onChange` просто не
 * сработал. Симптом: клик проходит без ошибки actionability, но ожидаемое состояние не
 * наступает. Chromium гидратируется достаточно быстро, чтобы окно гонки почти всегда
 * было уже закрыто к моменту клика; WebKit/Firefox под headless — не всегда.
 *
 * Первый клик может попасть в это окно; ко второму клику гидратация уже гарантированно
 * завершена, так что повторный клик почти всегда успешен.
 */
export async function clickWithHydrationRetry(
  clickTarget: Locator,
  waitFor: { locator: Locator; state: 'enabled' | 'visible' },
  firstTimeoutMs = 2_000,
  retryTimeoutMs = 5_000,
): Promise<void> {
  const assert = waitFor.state === 'enabled'
    ? () => expect(waitFor.locator).toBeEnabled({ timeout: firstTimeoutMs })
    : () => expect(waitFor.locator).toBeVisible({ timeout: firstTimeoutMs })
  const assertRetry = waitFor.state === 'enabled'
    ? () => expect(waitFor.locator).toBeEnabled({ timeout: retryTimeoutMs })
    : () => expect(waitFor.locator).toBeVisible({ timeout: retryTimeoutMs })

  await clickTarget.click()
  try {
    await assert()
  } catch {
    await clickTarget.click()
    await assertRetry()
  }
}

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

/**
 * Заполняет controlled-инпут (React value+onChange) с ретраем до подтверждения значения.
 *
 * Гонка (найдено 2026-08-08, aboi): `.fill()` сразу после `page.goto()`/предыдущего действия
 * может сработать до того, как React навесил `onChange` (гидратация) или между двумя `.fill()`
 * в одной форме случается лишний re-render, откатывающий уже заполненное значение соседнего
 * поля — в обоих случаях значение молча исчезает без ошибки actionability. Симптом воспроизведён
 * в WebKit заметно чаще, чем в Chromium/Firefox, но не эксклюзивен для него.
 *
 * `.fill()` идемпотентен (в отличие от toggle-клика), поэтому ретрай — это просто повтор
 * `fill()` + проверка `toHaveValue()` через `expect.toPass()`.
 */
export async function fillWithHydrationRetry(
  locator: Locator,
  value: string,
  timeoutMs = 10_000,
): Promise<void> {
  await expect(async () => {
    await locator.fill(value)
    await expect(locator).toHaveValue(value)
  }).toPass({ timeout: timeoutMs })
}

/**
 * Устанавливает checked-состояние controlled-чекбокса (Chakra v3 `Checkbox.Root` / Zag.js) с
 * ретраем, идемпотентным относительно уже достигнутого состояния.
 *
 * В отличие от {@link clickWithHydrationRetry} (клик + ожидание ПОБОЧНОГО эффекта на другом
 * элементе), здесь ожидаемое состояние — checked самого чекбокса. Простой повторный клик по
 * toggle-элементу неидемпотентен (второй клик снял бы уже выставленную галочку), поэтому перед
 * каждой попыткой проверяется текущее состояние — кликаем, только если чекбокс ещё не checked.
 *
 * `clickTarget` — обычно `[data-part="control"]` (визуальный квадратик), а не `<label>` целиком:
 * Zag.js вешает обработчик toggle конкретно на control-часть, клик по label/тексту согласия его
 * не триггерит (найдено 2026-08-09, svoichuzhie, подтверждено трейсом на staging).
 */
export async function checkWithHydrationRetry(
  clickTarget: Locator,
  checkboxLocator: Locator,
  timeoutMs = 15_000,
): Promise<void> {
  await expect(async () => {
    if (!(await checkboxLocator.isChecked())) {
      await clickTarget.click()
    }
    await expect(checkboxLocator).toBeChecked()
  }).toPass({ timeout: timeoutMs })
}

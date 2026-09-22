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
/**
 * Устанавливает файлы на `<input type="file">` с ретраем до подтверждения побочного эффекта.
 *
 * Гонка (найдено 2026-09-22, domwellbes): `setInputFiles()` физически проставляет `input.files` и
 * диспатчит трастовые `input`/`change` события сразу — но если это происходит до того, как React
 * навесил `onChange` (гидратация ещё не завершилась), событие теряется так же, как и в
 * {@link fillWithHydrationRetry}: `input.files` в DOM остаётся заполненным, а React-состояние (и
 * любой производный от него UI — например кнопка «Разобрать файл», которая включается только по
 * колбэку `onFilesSelected`) не меняется вовсе, без единой ошибки actionability. В отличие от
 * `fill()`, повторный `setInputFiles()` с теми же файлами идемпотентен по той же причине (просто
 * переустанавливает `FileList` и передиспатчит события) — ретраить безопасно.
 *
 * ⚠️ Клик по скрытому (`display: none`) `<input type="file">`, открывающему системный диалог через
 * `inputRef.current?.click()` в обработчике `onClick` контейнера (`page.waitForEvent('filechooser')`
 * + `Promise.all` с кликом), НЕ решает эту гонку — сам клик тоже не сработает, если гидратация не
 * завершилась, и `filechooser` просто не наступит (90с таймаут вместо потерянного `change`). Прямой
 * `setInputFiles()` на локаторе инпута с ретраем — единственный надёжный путь для Dropzone-паттерна
 * этого репозитория (скрытый input + видимый div-триггер).
 *
 * ⚠️ НЕ годится, если компонент дизейблит сам `<input>` на время загрузки (например
 * `ImageUploadField` из `@letar/image-upload` прокидывает в `Dropzone` `disabled={isLoading}`).
 * Ретрай внутри `toPass()` упирается в actionability-проверку Playwright («элемент должен быть
 * enabled») и виснет в ожидании, пока инпут снова станет доступен — весь `timeoutMs` уходит на
 * это ожидание, а не на то, чтобы дать первой (успешной) загрузке время дойти до конца. Симптом —
 * стабильный `Timeout ...ms exceeded`, не флейк. Для такого паттерна нужен одноразовый
 * `setInputFiles()` без ретрая (плюс `page.waitForLoadState('networkidle')` перед ним, если гонка
 * вызвана донагрузкой JS формы, а не самой гидратацией) — см.
 * `.claude/docs/e2e-testing.md` § «networkidle в dev-режиме Next.js», прецедент mandala
 * (2026-09-22, найдено при попытке перенести этот хелпер туда — 2/2 падений).
 */
export async function setInputFilesWithHydrationRetry(
  fileInput: Locator,
  files: Parameters<Locator['setInputFiles']>[0],
  waitFor: { locator: Locator; state: 'enabled' | 'visible' },
  timeoutMs = 20_000,
): Promise<void> {
  const assert = waitFor.state === 'enabled'
    ? () => expect(waitFor.locator).toBeEnabled({ timeout: 2_000 })
    : () => expect(waitFor.locator).toBeVisible({ timeout: 2_000 })
  await expect(async () => {
    await fileInput.setInputFiles(files)
    await assert()
  }).toPass({ timeout: timeoutMs })
}

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

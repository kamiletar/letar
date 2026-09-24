import type { Locator } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Заполняет набор полей одной формы и перед возвратом проверяет, что ВСЕ они держат значение.
 *
 * WebKit (драйвер Playwright) сбрасывает ранее заполненный controlled-инпут, когда следом
 * заполняется другое поле той же формы: `fill()` прошёл, а к сабмиту поле снова пустое. Это не
 * гонка гидратации при первом рендере, а сброс controlled-состояния на одном из последующих
 * commit'ов: воспроизводится одинаково и на Turbopack, и на webpack с прогретым кешем, в
 * Chromium/Firefox не наблюдается (найдено 2026-08-08, aboi email-verification — первопричина не
 * найдена). Позже независимо переоткрыто в domwellbes: на карточке сделки так терялся «Срок
 * задачи» — сервер отказывал в переходе NEW → «Установлен контакт» без задачи, и тест падал на
 * бейдже этапа через 15с (webkit, 2026-09-23).
 *
 * Чем отличается от `fillWithHydrationRetry`: тот доводит до нужного значения ОДНО поле и
 * выходит, а сброс случается как раз при заполнении следующего. Последовательные вызовы
 * `fillWithHydrationRetry` по каждому полю (и даже повторный такой проход перед сабмитом) не
 * гарантируют, что к клику все поля заполнены одновременно — последний `fill()` может стереть
 * первое поле. Здесь поля дозаполняются, пока все значения не совпадут в одной попытке.
 *
 * На каждой попытке перезаполняются только разошедшиеся поля. Клик перед `fill` обязателен для
 * WebKit (.claude/docs/e2e-testing.md).
 *
 * @param fields пары `[локатор, ожидаемое значение]` одной формы
 * @param timeoutMs общий лимит на дозаполнение
 */
export async function fillStable(
  fields: ReadonlyArray<readonly [Locator, string]>,
  timeoutMs = 15_000,
): Promise<void> {
  await expect(async () => {
    for (const [locator, value] of fields) {
      if ((await locator.inputValue()) !== value) {
        await locator.click()
        await locator.fill(value)
      }
    }
    for (const [locator, value] of fields) {
      await expect(locator).toHaveValue(value, { timeout: 1000 })
    }
  }).toPass({ timeout: timeoutMs })
}

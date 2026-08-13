import { vi } from 'vitest'

/**
 * `SelectContent`/`ComboboxContent` (Reka UI) измеряют доступное место через `ResizeObserver` и
 * позиционируются через `@floating-ui` — jsdom не реализует ни то, ни другое. Полифиллы ниже —
 * стандартный минимум для тестирования Radix/Reka-компонентов вне браузера, не специфика этой
 * библиотеки.
 */
/* eslint-disable @typescript-eslint/no-empty-function -- полифилл под jsdom, не production-код */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
/* eslint-enable @typescript-eslint/no-empty-function */

export function setupRekaPolyfills() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- полифилл под jsdom, не production-код
  ;(globalThis as any).ResizeObserver = ResizeObserverStub
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
  Element.prototype.scrollIntoView = vi.fn()
}

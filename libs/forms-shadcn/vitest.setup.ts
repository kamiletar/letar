// Расширенные матчеры для DOM тестирования
import '@testing-library/jest-dom/vitest'

// jsdom не реализует ResizeObserver — нужен Radix Slider (измеряет трек для позиции thumb).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {
      // noop — jsdom не считает layout, реальный размер трека тестам не нужен
    }
    unobserve(): void {
      // noop
    }
    disconnect(): void {
      // noop
    }
  }
}

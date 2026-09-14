// Расширенные матчеры для DOM тестирования
import '@testing-library/jest-dom/vitest'
import { mockCanvas2D } from '@letar/forms-core/testing'

// Мок Canvas 2D API для jsdom — FieldSignature вызывает `canvas.getContext('2d')` уже в
// `useEffect` при монтировании (initCanvas), поэтому реальный нативный аддон `canvas` грузится
// в каждом из тестов `field-signature.spec.tsx`; под test isolation vitest это иногда превышает
// таймаут (тот же класс флаки, что был найден и починен в `libs/forms/vitest.setup.ts`).
mockCanvas2D()

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

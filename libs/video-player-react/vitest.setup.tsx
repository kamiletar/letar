// Полифилы для jsdom

// structuredClone полифил
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = <T,>(obj: T): T => {
    if (obj === undefined) {
      return undefined as T
    }
    return JSON.parse(JSON.stringify(obj))
  }
}

// Пустая функция-заглушка
const noop = () => {
  /* намеренно пусто */
}

// ResizeObserver полифил
class MockResizeObserver {
  observe = noop
  unobserve = noop
  disconnect = noop
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// IntersectionObserver полифил
class MockIntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe = noop
  unobserve = noop
  disconnect = noop
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

import '@testing-library/jest-dom/vitest'

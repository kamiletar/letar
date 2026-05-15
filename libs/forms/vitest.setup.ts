// Расширенные матчеры для DOM тестирования
import '@testing-library/jest-dom/vitest'
// Мок для IndexedDB (требуется для offline функций)
import 'fake-indexeddb/auto'

// Polyfill для structuredClone (требуется для Chakra UI v3)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))
}

// Полифилл localStorage для jsdom (removeItem/clear могут отсутствовать)
if (typeof window !== 'undefined') {
  const store = new Map<string, string>()
  const storageMock: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    get length() {
      return store.size
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  }
  // Переопределяем localStorage только если методы отсутствуют
  if (typeof window.localStorage.removeItem !== 'function') {
    Object.defineProperty(window, 'localStorage', { value: storageMock, writable: true })
  }
}

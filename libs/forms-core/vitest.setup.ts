// Мок для IndexedDB (требуется для offline-service.ts — canUseIDB() проверяет typeof indexedDB)
import 'fake-indexeddb/auto'

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
  if (typeof window.localStorage.removeItem !== 'function') {
    Object.defineProperty(window, 'localStorage', { value: storageMock, writable: true })
  }
}

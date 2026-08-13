// Полифилл localStorage для jsdom — см. подробный комментарий в `libs/forms-vue/vitest.setup.ts`
// (Node 22+ подсовывает `window.localStorage` без `getItem`/`setItem`/`clear`). Нужен для тестов
// персистенции шага `Form.Steps` (Этап 6 часть 4, композиционная логика в `@letar/forms-vue/core`).
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

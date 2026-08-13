// Полифилл localStorage для jsdom (в этом окружении встроенный Node `localStorage` — заглушка
// без `getItem`/`setItem`/`clear`; `window.localStorage` в jsdom+Node 22+ на него ссылается, а
// не на настоящий jsdom `Storage`). Тот же полифилл, что и в `libs/forms/vitest.setup.ts` —
// нужен `use-step-persistence.ts` (`Form.Steps`, Этап 6 часть 4) для тестов персистенции шага.
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

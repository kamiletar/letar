// Общий load/save для одиночного строкового значения в localStorage — SSR-guard на `window` +
// try/catch. Вынесено из дублирования `pad-midi-map.ts`/`teleprompter-storage.ts` (оба хранили
// один плоский JSON/строковый ключ ровно этим же кодом).

export function loadLocalStorageString(key: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function saveLocalStorageString(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(key, value)
}

/**
 * Мок для idb-keyval
 * Используется в тестах оффлайн-хуков
 */
import { vi } from 'vitest'

// In-memory хранилище для тестов
const store = new Map<string, unknown>()

// Мок функций
export const get = vi.fn(<T>(key: string): Promise<T | undefined> => {
  return Promise.resolve(store.get(key) as T | undefined)
})

export const set = vi.fn(<T>(key: string, value: T): Promise<void> => {
  store.set(key, value)
  return Promise.resolve()
})

export const del = vi.fn((key: string): Promise<void> => {
  store.delete(key)
  return Promise.resolve()
})

export const clear = vi.fn((): Promise<void> => {
  store.clear()
  return Promise.resolve()
})

export const keys = vi.fn((): Promise<string[]> => {
  return Promise.resolve(Array.from(store.keys()) as string[])
})

export const entries = vi.fn(<T>(): Promise<[string, T][]> => {
  return Promise.resolve(Array.from(store.entries()) as [string, T][])
})

// Хелперы для тестов
export const __getStore = () => store
export const __resetStore = () => {
  store.clear()
  // Сбросить вызовы моков
  get.mockClear()
  set.mockClear()
  del.mockClear()
  clear.mockClear()
  keys.mockClear()
  entries.mockClear()
}

// Хелпер для установки начального состояния
export const __setInitialState = <T>(key: string, value: T) => {
  store.set(key, value)
}

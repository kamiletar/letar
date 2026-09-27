'use client'

import { type ReactNode, useCallback, useEffect, useSyncExternalStore } from 'react'

/**
 * Реестр видимых подписей полей формы: поле кладёт сюда свой `label`, зависимое поле берёт подпись родителя для
 * подсказки «Сначала выберите «Страна»» — без него в подсказке оказывается «сырое» имя пути (`country`), если в схеме
 * нет `ui.title`. Ключ — сама форма (`WeakMap`): жизнь реестра равна жизни формы, отдельный провайдер не нужен.
 */
interface LabelStore {
  labels: Map<string, string>
  /** Растёт при каждом изменении: по нему `useSyncExternalStore` перерисовывает читателей */
  version: number
  listeners: Set<() => void>
}

const stores = new WeakMap<object, LabelStore>()

function storeOf(form: object): LabelStore {
  let store = stores.get(form)
  if (!store) {
    store = { labels: new Map(), version: 0, listeners: new Set() }
    stores.set(form, store)
  }
  return store
}

function notify(store: LabelStore): void {
  store.version += 1
  store.listeners.forEach((listener) => listener())
}

/** Строковая подпись; узел (`ReactNode`) в подсказку не годится */
function labelText(label: ReactNode): string | undefined {
  return typeof label === 'string' && label.trim() !== '' ? label : undefined
}

/**
 * Поле регистрирует свою подпись. Вызывается из `createField` для каждого поля; узловая подпись не регистрируется.
 */
export function useRegisterFieldLabel(form: object | undefined, path: string, label: ReactNode): void {
  const text = labelText(label)
  useEffect(() => {
    if (!form || text === undefined) {
      return
    }
    const store = storeOf(form)
    if (store.labels.get(path) !== text) {
      store.labels.set(path, text)
      notify(store)
    }
    return () => {
      // Поле размонтировалось (или сменило подпись): чужую запись с тем же путём не трогаем
      if (store.labels.get(path) === text) {
        store.labels.delete(path)
        notify(store)
      }
    }
  }, [form, path, text])
}

/**
 * Подпись поля по полному пути — `undefined`, если поле не смонтировано или у него нет строковой подписи.
 * Идентичность функции меняется вместе с реестром, поэтому годится в зависимости `useMemo`/`useCallback`.
 */
export function useFieldLabelLookup(form: object | undefined): (path: string) => string | undefined {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!form) {
        return () => undefined
      }
      const store = storeOf(form)
      store.listeners.add(callback)
      return () => {
        store.listeners.delete(callback)
      }
    },
    [form],
  )
  const getVersion = useCallback(() => (form ? storeOf(form).version : 0), [form])
  const version = useSyncExternalStore(subscribe, getVersion, getVersion)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` — признак изменения реестра
  return useCallback((path: string) => (form ? storeOf(form).labels.get(path) : undefined), [form, version])
}

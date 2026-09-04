'use client'

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

/**
 * Реестр «чувствительных» dot-путей текущей формы (`"apiKey.value"`, `"settings.card.cvv"`).
 * Поля вроде `Form.Field.EditIntent` с `sensitive` регистрируют свой путь через
 * {@link useRegisterSensitiveField} при монтировании — потребители снимка формы
 * (persistence/DebugValues/URL sync/аналитика) читают текущий список через
 * {@link useSensitiveFieldPaths} и прогоняют его через `redactAtPaths`/`omitAtPaths`
 * (`@letar/forms-core/security`) перед тем, как значение покинет форму.
 *
 * Без `<SensitiveFieldsProvider>` выше по дереву регистрация и чтение — no-op с пустым списком,
 * а не ошибка: большинство существующих форм не используют `EditIntentValue` и не обязаны знать
 * об этом реестре.
 */

interface SensitiveFieldsRegistry {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => readonly string[]
  register: (path: string) => () => void
}

function createSensitiveFieldsRegistry(): SensitiveFieldsRegistry {
  const paths = new Set<string>()
  const listeners = new Set<() => void>()
  let snapshot: readonly string[] = []

  function notify() {
    snapshot = Array.from(paths)
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot() {
      return snapshot
    },
    register(path) {
      paths.add(path)
      notify()
      return () => {
        paths.delete(path)
        notify()
      }
    },
  }
}

const SensitiveFieldsRegistryContext = createContext<SensitiveFieldsRegistry | null>(null)

const EMPTY_PATHS: readonly string[] = []

const noopSubscribe = () => () => {}
const getEmptySnapshot = () => EMPTY_PATHS

export function SensitiveFieldsProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(createSensitiveFieldsRegistry)

  return (
    <SensitiveFieldsRegistryContext.Provider value={registry}>
      {children}
    </SensitiveFieldsRegistryContext.Provider>
  )
}

/**
 * Регистрирует `path` как чувствительный, пока `isSensitive` истинен и компонент смонтирован.
 * Вне `<SensitiveFieldsProvider>` — no-op (совместимо с формами, не использующими эту фичу).
 */
export function useRegisterSensitiveField(path: string, isSensitive: boolean): void {
  const registry = useContext(SensitiveFieldsRegistryContext)

  useEffect(() => {
    if (!registry || !isSensitive) {
      return undefined
    }
    return registry.register(path)
  }, [registry, isSensitive, path])
}

/** Текущий список зарегистрированных чувствительных путей. Пустой массив вне провайдера. */
export function useSensitiveFieldPaths(): readonly string[] {
  const registry = useContext(SensitiveFieldsRegistryContext)
  return useSyncExternalStore(
    registry ? registry.subscribe : noopSubscribe,
    registry ? registry.getSnapshot : getEmptySnapshot,
    registry ? registry.getSnapshot : getEmptySnapshot,
  )
}

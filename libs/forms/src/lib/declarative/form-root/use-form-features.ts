'use client'

import { omitAtPaths } from '@letar/forms-core/security'
import { useSensitiveFieldPaths } from '@letar/forms-react'
import { useCallback, useRef } from 'react'
import { type FormOfflineConfig, useOfflineForm } from '../../offline'
import { type FormPersistenceConfig, useFormPersistence } from '../form-persistence'
import type { FormOfflineState } from '../types'

/** Снимок значений для сравнения «правили или нет»; null — значения не сериализуются */
function safeJsonSnapshot(values: unknown): string | null {
  try {
    return JSON.stringify(values)
  } catch {
    return null
  }
}

/**
 * Конфигурация для хука useFormFeatures
 */
export interface UseFormFeaturesConfig<TData extends object> {
  /** Конфигурация persistence (сохранение данных в localStorage) */
  persistence?: FormPersistenceConfig
  /** Конфигурация offline-режима */
  offline?: FormOfflineConfig
  /** Function for online submission (called on submit) */
  onlineSubmit: (value: TData) => Promise<void>
}

/**
 * Result хука useFormFeatures
 */
export interface UseFormFeaturesResult<TData extends object> {
  /** Вkeyена ли persistence */
  isPersistenceEnabled: boolean
  /** Вkeyён ли offline-режим */
  isOfflineEnabled: boolean
  /** Result persistence хука */
  persistenceResult: ReturnType<typeof useFormPersistence<TData>>
  /** Result offline хука */
  offlineForm: ReturnType<typeof useOfflineForm<TData>>
  /** State offline для contextа form */
  offlineState: FormOfflineState | undefined
  /** Handler submit with support for offline and persistence */
  handleSubmit: (value: TData) => Promise<void>
  /** Подписка на изменения form для persistence */
  subscribeToFormChanges: (form: {
    store: { subscribe: (fn: () => void) => { unsubscribe: () => void } | (() => void) }
    state: { values: unknown }
  }) => () => void
  /** Восстановление данных из persistence */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  restoreFormData: (form: { setFieldValue: (key: string, value: any) => void }) => void
}

/**
 * Hook, объединяющий логику persistence и offline для форм.
 * Устраняет дублирование between FormSimple и FormWithApi.
 *
 * @example
 * const features = useFormFeatures({
 *   persistence: { key: 'my-form' },
 *   offline: { actionType: 'FORM_SUBMIT' },
 *   onlineSubmit: async (value) => {
 *     await saveData(value)
 *   }
 * })
 */
export function useFormFeatures<TData extends object>({
  persistence,
  offline,
  onlineSubmit,
}: UseFormFeaturesConfig<TData>): UseFormFeaturesResult<TData> {
  const isPersistenceEnabled = !!persistence
  const isOfflineEnabled = !!offline
  const sensitivePaths = useSensitiveFieldPaths()
  // Снимок значений на момент первой подписки = исходное состояние формы. Живёт в ref, а не в
  // замыкании подписки: эффект подписки перезапускается при смене `features`, и снимок,
  // взятый заново, оказался бы уже правленными значениями
  const baselineSnapshotRef = useRef<string | null>(null)

  // Hook persistence (if не вkeyён — используем disabled key)
  const persistenceResult = useFormPersistence<TData>(persistence ?? { key: '__disabled__' })

  // Wrapper для онлайн-отправки с очисткой persistence
  const offlineOnlineSubmit = useCallback(
    async (value: TData) => {
      try {
        await onlineSubmit(value)
        // Clear persistence on successful submit
        if (isPersistenceEnabled) {
          persistenceResult.clearSavedData()
        }
        return { success: true }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Error отправки' }
      }
    },
    [onlineSubmit, isPersistenceEnabled, persistenceResult],
  )

  // Hook offline (if вkeyён)
  const offlineForm = useOfflineForm<TData>({
    actionType: offline?.actionType ?? 'FORM_SUBMIT',
    onlineSubmit: offlineOnlineSubmit,
    onSuccess: () => {
      offline?.onSynced?.()
      // Очищаем persistence при успешной синхронизации
      if (isPersistenceEnabled) {
        persistenceResult.clearSavedData()
      }
    },
    onQueued: offline?.onQueued,
    onError: offline?.onSyncError,
  })

  // State offline для contextа form
  const offlineState: FormOfflineState | undefined = isOfflineEnabled
    ? {
      isOffline: offlineForm.isOffline,
      pendingCount: offlineForm.pendingCount,
      isProcessing: offlineForm.isProcessing,
      clearPersistence: isPersistenceEnabled ? persistenceResult.clearSavedData : undefined,
    }
    : undefined

  // Handler submit
  const handleSubmit = useCallback(
    async (value: TData): Promise<void> => {
      if (isOfflineEnabled) {
        // Use offline-aware submit
        await offlineForm.submit(value)
      } else {
        // Direct submit
        await onlineSubmit(value)
        // Clear persistence on success
        if (isPersistenceEnabled) {
          persistenceResult.clearSavedData()
        }
      }
    },
    [isOfflineEnabled, offlineForm, onlineSubmit, isPersistenceEnabled, persistenceResult],
  )

  // Подписка на изменения form для persistence
  const subscribeToFormChanges = useCallback(
    (form: {
      store: { subscribe: (fn: () => void) => { unsubscribe: () => void } | (() => void) }
      state: { values: unknown }
    }) => {
      if (!isPersistenceEnabled) {
        return () => {}
      }

      // Снимок берём в момент подписки, а не при первом уведомлении: первым уведомлением
      // может оказаться уже сама правка пользователя
      if (baselineSnapshotRef.current === null) {
        const initial = form.state.values as TData
        baselineSnapshotRef.current = safeJsonSnapshot(
          sensitivePaths.length > 0 ? omitAtPaths(initial, sensitivePaths) : initial,
        )
      }

      const subscription = form.store.subscribe(() => {
        const values = form.state.values as TData
        const safeValues = sensitivePaths.length > 0 ? omitAtPaths(values, sensitivePaths) : values

        // Стор формы шумит и без правок пользователя (монтирование, валидация, фокус/blur).
        // Значения при этом равны исходным — писать такой «черновик» нельзя: при следующем
        // открытии формы он вылезает диалогом «Восстановить сохранённые данные?» на пустом месте
        const snapshot = safeJsonSnapshot(safeValues)
        if (snapshot !== null && snapshot === baselineSnapshotRef.current) {
          return
        }

        persistenceResult.saveValues(safeValues)
      })

      // Совместимость: @tanstack/store 0.9+ returns Subscription, ранние — () => void
      if (typeof subscription === 'function') {
        return subscription
      }
      return () => subscription.unsubscribe()
    },
    [isPersistenceEnabled, persistenceResult, sensitivePaths],
  )

  // Восстановление данных из persistence
  const restoreFormData = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (form: { setFieldValue: (key: string, value: any) => void }) => {
      if (!isPersistenceEnabled || !persistenceResult.shouldRestore || !persistenceResult.savedData) {
        return
      }

      // Применяем сохранённые значения
      const dataToRestore = persistenceResult.savedData as Record<string, unknown>
      for (const [key, value] of Object.entries(dataToRestore)) {
        form.setFieldValue(key, value)
      }

      // Отмечаем восстановление как завершённое after тика
      setTimeout(() => {
        persistenceResult.markRestoreComplete()
      }, 0)
    },
    [isPersistenceEnabled, persistenceResult],
  )

  return {
    isPersistenceEnabled,
    isOfflineEnabled,
    persistenceResult,
    offlineForm,
    offlineState,
    handleSubmit,
    subscribeToFormChanges,
    restoreFormData,
  }
}

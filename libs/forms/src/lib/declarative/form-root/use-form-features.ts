'use client'

import { omitAtPaths } from '@letar/forms-core/security'
import { useSensitiveFieldPaths } from '@letar/forms-react'
import { useCallback, useEffect, useRef } from 'react'
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

/** Убирает из значений ключи верхнего уровня, которые persistence никогда не пишет в черновик */
function omitExcludedFields<TData extends object>(values: TData, excludeFields: string[] | undefined): TData {
  if (!excludeFields?.length || typeof values !== 'object' || values === null) {
    return values
  }
  return Object.fromEntries(Object.entries(values).filter(([key]) => !excludeFields.includes(key))) as TData
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
  const excludeFields = persistence?.excludeFields

  // Hook persistence (if не вkeyён — используем disabled key)
  const persistenceResult = useFormPersistence<TData>(persistence ?? { key: '__disabled__' })

  // Снимок значений в том виде, в каком они попали бы в черновик: без чувствительных путей и
  // без `excludeFields`. Одна функция для baseline, живых значений и загруженного черновика —
  // иначе черновик (без исключённых полей) никогда не совпал бы с значениями формы (с ними)
  const toSnapshot = useCallback(
    (values: TData): string | null => {
      const safe = sensitivePaths.length > 0 ? omitAtPaths(values, sensitivePaths) : values
      return safeJsonSnapshot(omitExcludedFields(safe, excludeFields))
    },
    [sensitivePaths, excludeFields],
  )

  // Актуальное состояние черновика для обработчика стора: он живёт в замыкании подписки и не
  // должен перезапускаться на каждый рендер ради чтения этих флагов
  const draftStateRef = useRef({ hasSavedData: false, isDialogOpen: false, shouldRestore: false })
  useEffect(() => {
    draftStateRef.current = {
      hasSavedData: persistenceResult.hasSavedData,
      isDialogOpen: persistenceResult.isDialogOpen,
      shouldRestore: persistenceResult.shouldRestore,
    }
  }, [persistenceResult.hasSavedData, persistenceResult.isDialogOpen, persistenceResult.shouldRestore])

  // Черновик, равный исходным значениям формы, — не черновик (правку вернули как было, а старая
  // запись после неудачного сабмита осталась). Удаляем молча, диалог не открываем.
  // Ждём baseline: он берётся при первой подписке; черновик приходит из localStorage позже.
  const { savedData, isDialogOpen, clearSavedData } = persistenceResult
  useEffect(() => {
    if (!isPersistenceEnabled || !isDialogOpen || !savedData || baselineSnapshotRef.current === null) {
      return
    }
    const draftSnapshot = toSnapshot(savedData)
    if (draftSnapshot !== null && draftSnapshot === baselineSnapshotRef.current) {
      clearSavedData()
      persistenceResult.closeDialog()
    }
  }, [isPersistenceEnabled, isDialogOpen, savedData, toSnapshot, clearSavedData, persistenceResult])

  // После clearSavedData() библиотека сама вызывает form.reset(dataToSubmit)
  // (usePostSubmitResetGuard) — это уведомление от стора нужно распознать как «не правка»,
  // иначе guard в subscribeToFormChanges сравнит его со снимком времени монтирования, не
  // совпадёт и тут же перезапишет черновик только что отправленными данными
  const updateBaselineAfterClear = useCallback(
    (value: TData) => {
      baselineSnapshotRef.current = toSnapshot(value)
    },
    [toSnapshot],
  )

  // Wrapper для онлайн-отправки с очисткой persistence
  const offlineOnlineSubmit = useCallback(
    async (value: TData) => {
      try {
        await onlineSubmit(value)
        // Clear persistence on successful submit
        if (isPersistenceEnabled) {
          persistenceResult.clearSavedData()
          updateBaselineAfterClear(value)
        }
        return { success: true }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Error отправки' }
      }
    },
    [onlineSubmit, isPersistenceEnabled, persistenceResult, updateBaselineAfterClear],
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
          updateBaselineAfterClear(value)
        }
      }
    },
    [isOfflineEnabled, offlineForm, onlineSubmit, isPersistenceEnabled, persistenceResult, updateBaselineAfterClear],
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
        baselineSnapshotRef.current = toSnapshot(initial)
      }

      const subscription = form.store.subscribe(() => {
        const values = form.state.values as TData
        const safeValues = sensitivePaths.length > 0 ? omitAtPaths(values, sensitivePaths) : values

        // Стор формы шумит и без правок пользователя (монтирование, валидация, фокус/blur).
        // Значения при этом равны исходным — писать такой «черновик» нельзя: при следующем
        // открытии формы он вылезает диалогом «Восстановить сохранённые данные?» на пустом месте
        const snapshot = toSnapshot(values)
        if (snapshot !== null && snapshot === baselineSnapshotRef.current) {
          // Значения вернулись к исходным — ранее записанный черновик (правка → неудачный сабмит →
          // возврат поля) устарел, иначе форма при следующем открытии предложит восстановить
          // данные, равные исходным. Пока диалог восстановления открыт, черновик ещё не принят
          // пользователем и шум стора его удалять не вправе
          const draft = draftStateRef.current
          if (draft.hasSavedData && !draft.isDialogOpen && !draft.shouldRestore) {
            persistenceResult.clearSavedData()
          }
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
    [isPersistenceEnabled, persistenceResult, sensitivePaths, toSnapshot],
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

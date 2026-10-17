'use client'

import { Button, Dialog, Portal, Text } from '@chakra-ui/react'
import { resolveStaticFormText } from '@letar/forms-core/i18n'
import { useFormI18n } from '@letar/forms-react'
import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react'

/**
 * Form persistence configuration
 */
export interface FormPersistenceConfig {
  /**
   * Unique key for localStorage
   * Must be unique per form to avoid conflicts
   */
  key: string

  /**
   * Debounce delay in milliseconds for saving
   * @default 500
   */
  debounceMs?: number

  /**
   * Draft time-to-live in milliseconds (TTL)
   * After TTL expires the draft is considered stale and automatically removed
   * @example 24 * 60 * 60 * 1000 // 24 hours
   * @default undefined — no time limit
   */
  ttl?: number

  /**
   * Dialog title
   * @default 'Восстановить сохранённые данные?' (переопределяется через FormI18nProvider —
   * ключ `formPersistence.restoreDialog.title`)
   */
  dialogTitle?: string

  /**
   * Dialog description
   * @default 'У вас есть несохранённые изменения с предыдущей сессии.' (переопределяется через
   * FormI18nProvider — ключ `formPersistence.restoreDialog.description`)
   */
  dialogDescription?: string

  /**
   * Restore button text
   * @default 'Восстановить' (переопределяется через FormI18nProvider — ключ
   * `formPersistence.restoreDialog.restoreButton`)
   */
  restoreButtonText?: string

  /**
   * Discard button text
   * @default 'Начать заново' (переопределяется через FormI18nProvider — ключ
   * `formPersistence.restoreDialog.discardButton`)
   */
  discardButtonText?: string

  /**
   * Clear draft button text (for ClearDraftButton)
   * @default 'Очистить черновик' (переопределяется через FormI18nProvider — ключ
   * `formPersistence.clearDraftButton`)
   */
  clearDraftButtonText?: string

  /**
   * Field keys that must NEVER be written to the saved snapshot
   * (password, card number, CVV, expiry date and similar sensitive data).
   * Shallow omit only — for `Form.Field.EditIntent`'s nested `${name}.value`, the
   * `SensitiveFieldsProvider` registry (`@letar/forms-react`) already strips it from the value
   * before it reaches `saveValues` (see `useFormFeatures`'s `subscribeToFormChanges`); this
   * field is for top-level keys the registry doesn't cover.
   * @default undefined — nothing excluded
   */
  excludeFields?: string[]
}

/**
 * Storage format for localStorage data (with metadata)
 * @internal
 */
interface StoredData<TData> {
  /** Saved form data */
  data: TData
  /** Save timestamp */
  savedAt: number
  /** Format version (for future migration) */
  version: 1
}

/**
 * Result of useFormPersistence hook
 */
export interface FormPersistenceResult<TData> {
  /**
   * Whether saved data exists
   */
  hasSavedData: boolean

  /**
   * Saved data (if any)
   */
  savedData: TData | null

  /**
   * Draft save timestamp
   * Used for displaying "Draft from 15:30"
   */
  savedAt: number | null

  /**
   * Whether restore dialog is open
   */
  isDialogOpen: boolean

  /**
   * Whether user chose to restore
   */
  shouldRestore: boolean

  /**
   * Save current form values to localStorage
   */
  saveValues: (values: TData) => void

  /**
   * Clear saved data from localStorage
   */
  clearSavedData: () => void

  /**
   * Accept and restore saved data
   */
  acceptRestore: () => TData | null

  /**
   * Reject restore and start fresh
   */
  rejectRestore: () => void

  /**
   * Close dialog without action
   */
  closeDialog: () => void

  /**
   * Mark restore as complete (called after form.reset)
   */
  markRestoreComplete: () => void

  /**
   * Dialog component for rendering
   */
  RestoreDialog: () => ReactElement | null

  /**
   * Clear draft button component
   * Shown only when saved data exists
   */
  ClearDraftButton: () => ReactElement | null
}

const STORAGE_PREFIX = 'form-persistence:'

/**
 * Переводит строку диалога через FormI18nProvider, если он подключён и перевод под ключом
 * реально задан; иначе — переданный дефолт (русский текст компонента). Общая лестница
 * `resolveStaticFormText` (`@letar/forms-core/i18n`) — здесь без встроенного словаря: fallback
 * приходит из пропов, а не из ru/en-словаря, поэтому `resolveBuiltin` игнорирует переданную
 * `locale` и всегда возвращает один и тот же дефолт.
 */
function localizeOrFallback(i18n: ReturnType<typeof useFormI18n>, key: string, fallback: string): string {
  return resolveStaticFormText(i18n, key, () => fallback)
}

/**
 * Hook for persisting form data in localStorage
 *
 * Automatically saves form state and shows a dialog
 * to restore saved data when the form loads.
 *
 * @example
 * ```tsx
 * const persistence = useFormPersistence<MyFormData>({
 *   key: 'my-form',
 *   debounceMs: 500,
 *   // Никогда не сохранять пароль/CVV в localStorage
 *   excludeFields: ['password', 'cvv'],
 * })
 *
 * // In form onSubmit:
 * const handleSubmit = (data) => {
 *   await saveToServer(data)
 *   persistence.clearSavedData() // Clear on success
 * }
 *
 * // Subscribe to form changes:
 * useEffect(() => {
 *   return form.store.subscribe(() => {
 *     persistence.saveValues(form.state.values)
 *   })
 * }, [])
 * ```
 */
export function useFormPersistence<TData extends object>(config: FormPersistenceConfig): FormPersistenceResult<TData> {
  const {
    key,
    debounceMs = 500,
    ttl,
    dialogTitle = 'Восстановить сохранённые данные?',
    dialogDescription = 'У вас есть несохранённые изменения с предыдущей сессии.',
    restoreButtonText = 'Восстановить',
    discardButtonText = 'Начать заново',
    clearDraftButtonText = 'Очистить черновик',
    excludeFields,
  } = config

  const storageKey = `${STORAGE_PREFIX}${key}`

  // FormI18nProvider опционален — при его отсутствии (или без перевода под ключом) остаются
  // русские дефолты выше, а не хардкод на одном языке
  const i18n = useFormI18n()
  const resolvedDialogTitle = localizeOrFallback(i18n, 'formPersistence.restoreDialog.title', dialogTitle)
  const resolvedDialogDescription = localizeOrFallback(
    i18n,
    'formPersistence.restoreDialog.description',
    dialogDescription,
  )
  const resolvedRestoreButtonText = localizeOrFallback(
    i18n,
    'formPersistence.restoreDialog.restoreButton',
    restoreButtonText,
  )
  const resolvedDiscardButtonText = localizeOrFallback(
    i18n,
    'formPersistence.restoreDialog.discardButton',
    discardButtonText,
  )
  const resolvedClearDraftButtonText = localizeOrFallback(
    i18n,
    'formPersistence.clearDraftButton',
    clearDraftButtonText,
  )

  // State
  const [savedData, setSavedData] = useState<TData | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [hasSavedData, setHasSavedData] = useState(false)
  const [shouldRestore, setShouldRestore] = useState(false)

  // Refs for debounce
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restoreButtonRef = useRef<HTMLButtonElement | null>(null)
  // Снимок сериализуется до ожидания: последующие мутации значений не меняют уже принятую копию.
  const pendingRef = useRef<{ key: string; json: string } | null>(null)

  const flushPending = useCallback((updateState = true) => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    const pending = pendingRef.current
    if (!pending) { return }
    try {
      const now = Date.now()
      localStorage.setItem(pending.key, `{"data":${pending.json},"savedAt":${now},"version":1}`)
      pendingRef.current = null
      if (updateState) {
        setSavedAt(now)
        setHasSavedData(true)
      }
    } catch {
      // Недоступное хранилище не ломает ввод; при уходе со страницы повторяем попытку.
    }
  }, [])

  useEffect(() => {
    const onPageHide = () => flushPending()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      // В том числе при смене ключа: pending хранит собственный ключ предыдущей формы.
      flushPending(false)
    }
  }, [storageKey, flushPending])

  // Load saved data on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Новый ключ относится к другой форме/автору и не наследует состояние предыдущего.
    // oxlint-disable-next-line react/set-state-in-effect
    setSavedData(null)
    setSavedAt(null)
    setHasSavedData(false)
    setIsDialogOpen(false)
    setShouldRestore(false)
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as TData | StoredData<TData>

        // Check data format (new with version or old without)
        let data: TData
        let timestamp: number

        if (parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 1) {
          // New format with metadata
          const storedData = parsed as StoredData<TData>
          data = storedData.data
          timestamp = storedData.savedAt

          // Check TTL
          if (ttl !== undefined) {
            const age = Date.now() - timestamp
            if (age > ttl) {
              // Data expired — remove
              localStorage.removeItem(storageKey)
              return
            }
          }
        } else {
          // Old format (for backward compatibility)
          data = parsed as TData
          timestamp = Date.now() // Unknown exact time, use current
        }

        // Легитимная синхронизация с внешней системой (localStorage), не производное
        // значение — данные недоступны на сервере/при первом клиентском рендере, поэтому
        // не могут попасть в useState-инициализатор без рассинхрона SSR/CSR разметки.
        // oxlint-disable-next-line react/set-state-in-effect
        setSavedData(data)
        setSavedAt(timestamp)
        setHasSavedData(true)
        setIsDialogOpen(true)
      }
    } catch {
      // localStorage может быть запрещён целиком, включая удаление повреждённой записи.
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // Недоступное хранилище не блокирует ввод.
      }
    }
  }, [storageKey, ttl])

  // Save values (with debounce)
  const saveValues = useCallback(
    (values: TData) => {
      // Don't save while restore dialog is still showing
      if (isDialogOpen || shouldRestore) {
        return
      }

      try {
        // Чувствительные поля исключаются до записи pending, включая аварийный flush.
        const safeValues = excludeFields?.length
          ? Object.fromEntries(Object.entries(values).filter(([fieldKey]) => !excludeFields.includes(fieldKey)))
          : values
        pendingRef.current = { key: storageKey, json: JSON.stringify(safeValues) }
      } catch {
        // Несериализуемые значения не должны ломать форму.
        return
      }
      if (debounceTimerRef.current !== null) { clearTimeout(debounceTimerRef.current) }
      if (debounceMs <= 0) { flushPending() }
      else { debounceTimerRef.current = setTimeout(() => flushPending(), debounceMs) }
    },
    [storageKey, debounceMs, isDialogOpen, shouldRestore, excludeFields, flushPending],
  )

  // Clear saved data
  const clearSavedData = useCallback(() => {
    pendingRef.current = null
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Ignore errors
    }
    setSavedData(null)
    setSavedAt(null)
    setHasSavedData(false)
  }, [storageKey])

  // Accept restore
  const acceptRestore = useCallback(() => {
    setShouldRestore(true)
    setIsDialogOpen(false)
    // Keep savedData so the caller can use it
    return savedData
  }, [savedData])

  // Mark restore as complete (called after form.reset)
  const markRestoreComplete = useCallback(() => {
    setShouldRestore(false)
    // Восстановление ещё не означает успешное сохранение на сервере.
  }, [])

  // Reject restore
  const rejectRestore = useCallback(() => {
    clearSavedData()
    setIsDialogOpen(false)
  }, [clearSavedData])

  // Close dialog
  const closeDialog = useCallback(() => {
    setIsDialogOpen(false)
  }, [])

  // Dialog component
  const RestoreDialog = useCallback((): ReactElement | null => {
    if (!hasSavedData) {
      return null
    }

    return (
      <Dialog.Root
        open={isDialogOpen}
        initialFocusEl={() => restoreButtonRef.current}
        closeOnEscape={false}
        closeOnInteractOutside={false}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{resolvedDialogTitle}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>{resolvedDialogDescription}</Text>
              </Dialog.Body>
              <Dialog.Footer gap={3}>
                <Button type="button" variant="outline" onClick={rejectRestore}>
                  {resolvedDiscardButtonText}
                </Button>
                <Button ref={restoreButtonRef} type="button" colorPalette="blue" onClick={() => acceptRestore()}>
                  {resolvedRestoreButtonText}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    )
  }, [
    hasSavedData,
    isDialogOpen,
    resolvedDialogTitle,
    resolvedDialogDescription,
    resolvedRestoreButtonText,
    resolvedDiscardButtonText,
    rejectRestore,
    acceptRestore,
  ])

  // Clear draft button component
  const ClearDraftButton = useCallback((): ReactElement | null => {
    // Don't show if no saved data or restore dialog is open
    if (!hasSavedData || isDialogOpen) {
      return null
    }

    return (
      <Button type="button" variant="ghost" size="sm" colorPalette="red" onClick={clearSavedData}>
        {resolvedClearDraftButtonText}
      </Button>
    )
  }, [hasSavedData, isDialogOpen, clearSavedData, resolvedClearDraftButtonText])

  return {
    hasSavedData,
    savedData,
    savedAt,
    isDialogOpen,
    shouldRestore,
    saveValues,
    clearSavedData,
    acceptRestore,
    rejectRestore,
    closeDialog,
    markRestoreComplete,
    RestoreDialog,
    ClearDraftButton,
  }
}

/**
 * Props for FormWithPersistence component
 */
export interface FormPersistenceProps {
  /**
   * Persistence configuration
   */
  persistence?: FormPersistenceConfig
}

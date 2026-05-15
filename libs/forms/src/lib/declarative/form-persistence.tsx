'use client'

import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react'
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
   * @default 'Restore saved data?'
   */
  dialogTitle?: string

  /**
   * Dialog description
   * @default 'You have unsaved changes from a previous session.'
   */
  dialogDescription?: string

  /**
   * Restore button text
   * @default 'Restore'
   */
  restoreButtonText?: string

  /**
   * Discard button text
   * @default 'Start fresh'
   */
  discardButtonText?: string

  /**
   * Clear draft button text (for ClearDraftButton)
   * @default 'Clear draft'
   */
  clearDraftButtonText?: string
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
    dialogTitle = 'Restore saved data?',
    dialogDescription = 'You have unsaved changes from a previous session.',
    restoreButtonText = 'Restore',
    discardButtonText = 'Start fresh',
    clearDraftButtonText = 'Clear draft',
  } = config

  const storageKey = `${STORAGE_PREFIX}${key}`

  // State
  const [savedData, setSavedData] = useState<TData | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [hasSavedData, setHasSavedData] = useState(false)
  const [shouldRestore, setShouldRestore] = useState(false)

  // Refs for debounce
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved data on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

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

        setSavedData(data)
        setSavedAt(timestamp)
        setHasSavedData(true)
        setIsDialogOpen(true)
      }
    } catch {
      // Invalid JSON or localStorage error — ignore
      localStorage.removeItem(storageKey)
    }
  }, [storageKey, ttl])

  // Save values (with debounce)
  const saveValues = useCallback(
    (values: TData) => {
      // Don't save while restore dialog is still showing
      if (isDialogOpen) {
        return
      }

      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set new deferred save
      debounceTimerRef.current = setTimeout(() => {
        try {
          const now = Date.now()
          const storedData: StoredData<TData> = {
            data: values,
            savedAt: now,
            version: 1,
          }
          localStorage.setItem(storageKey, JSON.stringify(storedData))
          setSavedAt(now)
          setHasSavedData(true)
        } catch {
          // localStorage may be full or disabled
        }
      }, debounceMs)
    },
    [storageKey, debounceMs, isDialogOpen]
  )

  // Clear saved data
  const clearSavedData = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
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
    clearSavedData()
  }, [clearSavedData])

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
        onOpenChange={(details) => {
          if (!details.open) {
            closeDialog()
          }
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{dialogTitle}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>{dialogDescription}</Text>
              </Dialog.Body>
              <Dialog.Footer gap={3}>
                <Button variant="outline" onClick={rejectRestore}>
                  {discardButtonText}
                </Button>
                <Button colorPalette="blue" onClick={() => acceptRestore()}>
                  {restoreButtonText}
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" onClick={rejectRestore} />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    )
  }, [
    hasSavedData,
    isDialogOpen,
    dialogTitle,
    dialogDescription,
    restoreButtonText,
    discardButtonText,
    closeDialog,
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
      <Button variant="ghost" size="sm" colorPalette="red" onClick={clearSavedData}>
        {clearDraftButtonText}
      </Button>
    )
  }, [hasSavedData, isDialogOpen, clearSavedData, clearDraftButtonText])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

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

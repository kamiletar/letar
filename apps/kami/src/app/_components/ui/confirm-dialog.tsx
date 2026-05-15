'use client'

import { Button, Dialog, Portal } from '@chakra-ui/react'
import { useCallback, useRef, useState } from 'react'

interface ConfirmOptions {
  /** Заголовок диалога */
  title: string
  /** Описание (опционально) */
  description?: string
  /** Текст кнопки подтверждения */
  confirmLabel?: string
  /** Текст кнопки отмены */
  cancelLabel?: string
  /** Цветовая палитра кнопки подтверждения */
  colorPalette?: string
}

interface ConfirmDialogState extends ConfirmOptions {
  open: boolean
  resolve: ((value: boolean) => void) | null
}

/**
 * Хук для замены browser confirm() на Chakra UI Dialog.
 * Возвращает confirm() — промис с boolean, и ConfirmDialog — компонент для рендера.
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    resolve: null,
  })
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setState({
        ...options,
        open: true,
        resolve,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    resolveRef.current = null
    setState((prev) => ({ ...prev, open: false }))
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    resolveRef.current = null
    setState((prev) => ({ ...prev, open: false }))
  }, [])

  const ConfirmDialogComponent = useCallback(
    () => (
      <Dialog.Root
        open={state.open}
        onOpenChange={({ open }) => {
          if (!open) {
            handleCancel()
          }
        }}
        role="alertdialog"
        placement="center"
        size="sm"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{state.title}</Dialog.Title>
              </Dialog.Header>
              {state.description && (
                <Dialog.Body>
                  <Dialog.Description>{state.description}</Dialog.Description>
                </Dialog.Body>
              )}
              <Dialog.Footer>
                <Button variant="outline" onClick={handleCancel}>
                  {state.cancelLabel || 'Отмена'}
                </Button>
                <Button colorPalette={state.colorPalette || 'red'} onClick={handleConfirm}>
                  {state.confirmLabel || 'Удалить'}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    ),
    [
      state.open,
      state.title,
      state.description,
      state.confirmLabel,
      state.cancelLabel,
      state.colorPalette,
      handleCancel,
      handleConfirm,
    ]
  )

  return { confirm, ConfirmDialog: ConfirmDialogComponent }
}

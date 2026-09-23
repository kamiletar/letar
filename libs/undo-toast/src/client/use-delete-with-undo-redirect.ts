'use client'

import type { CreateToasterReturn } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { triggerDeferredUndoableAction } from '../lib/undo-toast'

export interface DeleteWithUndoRedirectOptions {
  toaster: CreateToasterReturn
  /** `undefined` (новая запись, ещё не сохранённая) — `handleDelete` становится no-op. */
  id: string | undefined
  /** Куда уйти сразу по клику — до отложенного `onCommit`, не после него. */
  redirectTo: string
  message: string
  errorTitle: string
  deleteAction: (id: string) => Promise<unknown>
}

/**
 * Паттерн «форма записи → удалить → редирект на список» с `triggerDeferredUndoableAction` —
 * найден дословно в 9+ admin-форм (аудит confirm() в `apps/domwellbes/PLAN_CROSSCUTTING.md`,
 * «Единообразие админки»). Редирект намеренно происходит ДО коммита: запись уже не видна на
 * экране, куда вернётся клик «Отменить», поэтому `onUndo` у этого хука всегда пустая функция —
 * восстанавливать на UI нечего, а сервер ещё не тронут.
 */
export function useDeleteWithUndoRedirect(options: DeleteWithUndoRedirectOptions): () => void {
  const { toaster, id, redirectTo, message, errorTitle, deleteAction } = options
  const router = useRouter()

  return useCallback(() => {
    if (!id) {
      return
    }
    router.push(redirectTo)
    triggerDeferredUndoableAction(toaster, {
      message,
      onCommit: async () => {
        await deleteAction(id)
      },
      onUndo: () => {},
      onError: () => toaster.create({ title: errorTitle, type: 'error' }),
    }, undefined)
  }, [router, id, redirectTo, message, errorTitle, deleteAction, toaster])
}

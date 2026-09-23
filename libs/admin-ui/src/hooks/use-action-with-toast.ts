'use client'

import type { CreateToasterReturn } from '@chakra-ui/react'
import { useCallback, useTransition } from 'react'

import { isActionFailure } from '@letar/forms'

export interface RunActionWithToastOptions<TResult> {
  /** Текст тоста, если action бросил исключение (не вернул ожидаемую бизнес-ошибку значением). */
  errorTitle: string
  /**
   * Достаёт бизнес-ошибку из успешно вернувшегося результата (`result.error`,
   * `'error' in result ? result.error : undefined` и т.п.) — если у action нет такого канала
   * (кидает исключение вместо возврата `{error}`), опусти опцию. `ActionFailure` от
   * `catchActionFailure` (`@letar/forms/server-errors`) распознаётся автоматически ещё до этой
   * опции — задавать `getError` под неё отдельно не нужно.
   */
  getError?: (result: TResult) => string | null | undefined
  /** Вызывается, если бизнес-ошибки/исключения не было — refresh/push/обновление локального состояния. */
  onSuccess?: (result: TResult) => void
  /**
   * Доп. side effect при ЛЮБОЙ ошибке (бизнес-ошибка из `getError` ИЛИ исключение) — например
   * откат оптимистично применённого состояния. Тост хук показывает сам, независимо от этого колбэка.
   */
  onError?: () => void
}

/**
 * Снимает боль ручного `startTransition(async () => { try { ... } catch { adminToaster.create(...) } })`,
 * найденного дословно в 2026-09-23 в 26 местах `(admin)`-панели (`PLAN_CROSSCUTTING.md`,
 * «Тот же класс бага шире: сырой startTransition без try/catch») — без try/catch исключение из
 * Server Action улетает необработанным promise rejection внутри `startTransition`: элемент
 * управления просто ничего не делает, без единого сообщения пользователю.
 *
 * Не для удаления с редиректом на список — там `useDeleteWithUndoRedirect`
 * (`@letar/undo-toast/client`). Этот хук — для одиночного действия без редиректа (кнопка статуса/
 * дублирования, тоггл, чекбокс, инлайновая мини-секция).
 */
export function useActionWithToast(toaster: CreateToasterReturn) {
  const [isPending, startTransition] = useTransition()

  const run = useCallback(<TResult>(
    action: () => Promise<TResult>,
    options: RunActionWithToastOptions<TResult>,
  ) => {
    const { errorTitle, getError, onSuccess, onError } = options
    startTransition(async () => {
      try {
        const result = await action()
        const businessError = isActionFailure(result) ? result.error : getError?.(result)
        if (businessError) {
          onError?.()
          toaster.create({ title: businessError, type: 'error' })
          return
        }
        onSuccess?.(result)
      } catch (e) {
        onError?.()
        toaster.create({
          title: errorTitle,
          description: e instanceof Error ? e.message : undefined,
          type: 'error',
        })
      }
    })
  }, [toaster])

  return { run, isPending } as const
}

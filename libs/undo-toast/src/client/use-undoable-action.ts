'use client'

import type { CreateToasterReturn } from '@chakra-ui/react'
import { useCallback } from 'react'
import {
  type DeferredUndoToastOptions,
  triggerDeferredUndoableAction,
  triggerUndoableAction,
  type UndoToastOptions,
} from '../lib/undo-toast'

/**
 * Тонкая обёртка `triggerUndoableAction` (немедленный commit + реальная отмена, нужен
 * soft-delete/restore на сервере) для использования внутри компонента — `options` не
 * мемоизируется автоматически, при нестабильных колбэках передавай их через
 * `useCallback`/`useMemo` на стороне вызывающего компонента.
 */
export function useUndoableAction<TVars>(
  toaster: CreateToasterReturn,
  options: UndoToastOptions<TVars>,
): (vars: TVars) => void {
  return useCallback((vars: TVars) => triggerUndoableAction(toaster, options, vars), [toaster, options])
}

/**
 * Тонкая обёртка `triggerDeferredUndoableAction` (отложенный commit + pagehide-safety, для
 * действий без обратного восстановления на сервере) — те же правила мемоизации `options`, что и
 * у `useUndoableAction`.
 */
export function useDeferredUndoableAction<TVars>(
  toaster: CreateToasterReturn,
  options: DeferredUndoToastOptions<TVars>,
): (vars: TVars) => void {
  return useCallback((vars: TVars) => triggerDeferredUndoableAction(toaster, options, vars), [toaster, options])
}

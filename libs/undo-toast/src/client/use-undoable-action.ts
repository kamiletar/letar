'use client'

import type { CreateToasterReturn } from '@chakra-ui/react'
import { useCallback } from 'react'
import { triggerUndoableAction, type UndoToastOptions } from '../lib/undo-toast'

/**
 * Тонкая обёртка `triggerUndoableAction` для использования внутри компонента —
 * `options` не мемоизируется автоматически, при нестабильных колбэках передавай их через
 * `useCallback`/`useMemo` на стороне вызывающего компонента.
 */
export function useUndoableAction<TVars>(
  toaster: CreateToasterReturn,
  options: UndoToastOptions<TVars>,
): (vars: TVars) => void {
  return useCallback((vars: TVars) => triggerUndoableAction(toaster, options, vars), [toaster, options])
}

'use client'

import { HStack, IconButton, Text } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { UseFormHistoryResult } from './types'

export interface HistoryControlsProps {
  /** Результат useFormHistory */
  history: UseFormHistoryResult
  /** Показать счётчик (N/M) */
  showCounter?: boolean
  /** Размер кнопок */
  size?: 'xs' | 'sm' | 'md'
}

/**
 * Form.History.Controls — визуальные кнопки Undo/Redo.
 *
 * @example
 * ```tsx
 * const historyApi = useFormHistory(form)
 * <HistoryControls history={historyApi} />
 * ```
 */
export function HistoryControls({ history, showCounter = true, size = 'sm' }: HistoryControlsProps): ReactElement {
  return (
    <HStack gap={1}>
      <IconButton
        aria-label="Undo (Ctrl+Z)"
        size={size}
        variant="ghost"
        disabled={!history.canUndo}
        onClick={history.undo}
        title="Отменить (Ctrl+Z)"
      >
        ↩
      </IconButton>
      <IconButton
        aria-label="Redo (Ctrl+Y)"
        size={size}
        variant="ghost"
        disabled={!history.canRedo}
        onClick={history.redo}
        title="Повторить (Ctrl+Y)"
      >
        ↪
      </IconButton>
      {showCounter && (
        <Text fontSize="xs" color="fg.muted" minW="40px" textAlign="center">
          {history.currentIndex + 1}/{history.historyLength}
        </Text>
      )}
    </HStack>
  )
}

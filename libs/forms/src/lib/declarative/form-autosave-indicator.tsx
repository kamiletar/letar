'use client'

import { HStack, Spinner, Text } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { AutosaveStatus } from './form-autosave'

/** Props для AutosaveIndicator */
export interface AutosaveIndicatorProps {
  /** Статус автосохранения */
  status: AutosaveStatus
  /** Время последнего сохранения */
  lastSavedAt: Date | null
  /** Текст ошибки */
  error: string | null
  /** Кастомные тексты */
  labels?: {
    idle?: string
    saving?: string
    saved?: string
    error?: string
  }
}

/**
 * Индикатор статуса автосохранения.
 *
 * @example
 * ```tsx
 * const autosave = useFormAutosave(form, config)
 * <AutosaveIndicator status={autosave.status} lastSavedAt={autosave.lastSavedAt} error={autosave.error} />
 * ```
 */
export function AutosaveIndicator({ status, lastSavedAt, error, labels }: AutosaveIndicatorProps): ReactElement | null {
  if (status === 'idle') return null

  const defaultLabels = {
    idle: '',
    saving: 'Сохраняю...',
    saved: 'Сохранено',
    error: 'Ошибка сохранения',
  }
  const l = { ...defaultLabels, ...labels }

  return (
    <HStack gap={2} fontSize="xs" color="fg.muted">
      {status === 'saving' && (
        <>
          <Spinner size="xs" />
          <Text>{l.saving}</Text>
        </>
      )}
      {status === 'saved' && (
        <Text color="green.500">
          ✓ {l.saved}
          {lastSavedAt && ` (${lastSavedAt.toLocaleTimeString()})`}
        </Text>
      )}
      {status === 'error' && (
        <Text color="red.500">
          ✕ {l.error}: {error}
        </Text>
      )}
    </HStack>
  )
}

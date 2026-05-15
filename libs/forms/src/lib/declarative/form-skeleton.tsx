'use client'

import { Box, Skeleton, VStack } from '@chakra-ui/react'
import type { ReactElement } from 'react'

export interface FormSkeletonProps {
  /** Количество полей (или Zod-схема для автодетекта) */
  fields?: number | unknown
  /** Показать скелетон кнопки submit */
  showSubmit?: boolean
  /** Высота каждого поля */
  fieldHeight?: string
  /** Расстояние между полями */
  gap?: number
}

/**
 * Form.Skeleton — loading state для формы.
 * Показывает скелетоны полей пока загружаются данные.
 */
export function FormSkeleton({
  fields = 5,
  showSubmit = true,
  fieldHeight = '60px',
  gap = 4,
}: FormSkeletonProps): ReactElement {
  // Определяем количество полей
  let fieldCount: number
  if (typeof fields === 'number') {
    fieldCount = fields
  } else if (typeof fields === 'object' && fields !== null && '_def' in fields) {
    try {
      const s = fields as { _def?: { shape?: () => Record<string, unknown> } }
      fieldCount = s._def?.shape ? Object.keys(s._def.shape()).length : 5
    } catch {
      fieldCount = 5
    }
  } else {
    fieldCount = 5
  }

  return (
    <VStack gap={gap} align="stretch">
      {Array.from({ length: fieldCount }, (_, i) => (
        <Box key={i}>
          {/* Label скелетон */}
          <Skeleton height="14px" width={`${60 + Math.random() * 40}%`} mb={2} />
          {/* Input скелетон */}
          <Skeleton height={fieldHeight} borderRadius="md" />
        </Box>
      ))}
      {showSubmit && (
        <Box pt={2}>
          <Skeleton height="40px" width="140px" borderRadius="md" />
        </Box>
      )}
    </VStack>
  )
}

'use client'

import { Box, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { safeStringify } from '../utils/safe-stringify'

export interface FormReadOnlyViewProps<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Данные для отображения */
  data: T
  /** Zod-схема для извлечения labels из .meta({ ui: { title } }) */
  schema?: unknown
  /** Кастомные labels для полей */
  labels?: Record<string, string>
  /** Поля для исключения */
  exclude?: string[]
  /** Поля для включения (если указано — только они) */
  include?: string[]
  /** Форматтеры значений */
  formatters?: Record<string, (value: unknown) => string>
  /** Компактный режим (одна строка на поле) */
  compact?: boolean
}

/**
 * Form.ReadOnlyView — отображение данных формы в режиме чтения.
 * Автоматически извлекает labels из Zod .meta({ ui: { title } }).
 */
export function FormReadOnlyView<T extends Record<string, unknown>>({
  data,
  schema,
  labels = {},
  exclude = [],
  include,
  formatters = {},
  compact = false,
}: FormReadOnlyViewProps<T>): ReactElement {
  // Извлекаем labels из Zod-схемы (безопасный доступ через unknown)
  const schemaLabels: Record<string, string> = {}
  try {
    const s = schema as { _def?: { shape?: () => Record<string, { _def?: { meta?: { ui?: { title?: string } } } }> } }
    if (s?._def?.shape) {
      const shape = s._def.shape()
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const title = fieldSchema?._def?.meta?.ui?.title
        if (title) schemaLabels[key] = title
      }
    }
  } catch {}

  const entries = Object.entries(data).filter(([key]) => {
    if (exclude.includes(key)) return false
    if (include && !include.includes(key)) return false
    return true
  })

  return (
    <VStack gap={compact ? 2 : 4} align="stretch">
      {entries.map(([key, value], index) => {
        const label = labels[key] ?? schemaLabels[key] ?? humanizeKey(key)
        const formatter = formatters[key]
        const displayValue = formatter ? formatter(value) : formatValue(value)

        return compact ? (
          <HStack key={key} justify="space-between" fontSize="sm">
            <Text color="fg.muted" fontWeight="medium">
              {label}
            </Text>
            <Text>{displayValue}</Text>
          </HStack>
        ) : (
          <Box key={key}>
            <Text fontSize="xs" color="fg.muted" fontWeight="medium" mb={1}>
              {label}
            </Text>
            <Text fontSize="sm">{displayValue}</Text>
            {index < entries.length - 1 && <Separator mt={3} />}
          </Box>
        )
      })}
    </VStack>
  )
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
}

function formatValue(value: unknown): string {
  return safeStringify(value)
}

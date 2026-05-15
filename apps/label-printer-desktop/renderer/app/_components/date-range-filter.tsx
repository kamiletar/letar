'use client'

import { HStack, Input, type StackProps, Text } from '@chakra-ui/react'

/** Пропсы компонента DateRangeFilter */
export interface DateRangeFilterProps extends Omit<StackProps, 'onChange'> {
  /** Начальная дата (ISO формат YYYY-MM-DD) */
  startDate: string
  /** Конечная дата (ISO формат YYYY-MM-DD) */
  endDate: string
  /** Callback при изменении начальной даты */
  onStartChange: (date: string) => void
  /** Callback при изменении конечной даты */
  onEndChange: (date: string) => void
  /** Ширина полей ввода (по умолчанию 160px) */
  inputWidth?: string | number
  /** Лейблы для полей */
  labels?: {
    start?: string
    end?: string
    separator?: string
  }
}

/** Лейблы по умолчанию */
const DEFAULT_LABELS = {
  start: 'С',
  end: 'По',
  separator: '—',
}

/**
 * Фильтр по диапазону дат
 * Устраняет дублирование date-range паттерна на страницах history и stats
 *
 * @example
 * <DateRangeFilter
 *   startDate={startDate}
 *   endDate={endDate}
 *   onStartChange={setStartDate}
 *   onEndChange={setEndDate}
 * />
 */
export function DateRangeFilter({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  inputWidth = '160px',
  labels = DEFAULT_LABELS,
  ...stackProps
}: DateRangeFilterProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels }

  return (
    <HStack gap={2} {...stackProps}>
      {mergedLabels.start && (
        <Text color="fg.muted" fontSize="sm">
          {mergedLabels.start}
        </Text>
      )}
      <Input type="date" value={startDate} onChange={(e) => onStartChange(e.target.value)} w={inputWidth} />
      <Text color="fg.muted">{mergedLabels.separator}</Text>
      {mergedLabels.end && (
        <Text color="fg.muted" fontSize="sm">
          {mergedLabels.end}
        </Text>
      )}
      <Input type="date" value={endDate} onChange={(e) => onEndChange(e.target.value)} w={inputWidth} />
    </HStack>
  )
}

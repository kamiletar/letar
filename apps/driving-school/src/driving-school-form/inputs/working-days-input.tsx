'use client'

import { Box, HStack, Input, Stack, Text } from '@chakra-ui/react'
import { memo, useCallback } from 'react'

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Пн', fullLabel: 'Понедельник' },
  { value: 'TUESDAY', label: 'Вт', fullLabel: 'Вторник' },
  { value: 'WEDNESDAY', label: 'Ср', fullLabel: 'Среда' },
  { value: 'THURSDAY', label: 'Чт', fullLabel: 'Четверг' },
  { value: 'FRIDAY', label: 'Пт', fullLabel: 'Пятница' },
  { value: 'SATURDAY', label: 'Сб', fullLabel: 'Суббота' },
  { value: 'SUNDAY', label: 'Вс', fullLabel: 'Воскресенье' },
] as const

export type DayOfWeekEnum = (typeof DAYS_OF_WEEK)[number]['value']

export interface WorkingDaysValue {
  days: string[]
  startTime: string
  endTime: string
}

export interface WorkingDaysInputProps {
  value: WorkingDaysValue
  onChange: (value: WorkingDaysValue) => void
  disabled?: boolean
}

/**
 * Компонент выбора рабочих дней и общего времени работы
 *
 * Упрощённая версия для онбординга — одинаковое время для всех рабочих дней.
 * Для детальной настройки по дням используйте ScheduleInput.
 *
 * @example
 * ```tsx
 * <WorkingDaysInput
 *   value={{ days: ['MONDAY', 'TUESDAY'], startTime: '09:00', endTime: '18:00' }}
 *   onChange={setValue}
 * />
 * ```
 */
export const WorkingDaysInput = memo(function WorkingDaysInput({ value, onChange, disabled }: WorkingDaysInputProps) {
  const handleDayChange = useCallback(
    (day: string, checked: boolean) => {
      const newDays = checked ? [...value.days, day] : value.days.filter((d) => d !== day)
      onChange({ ...value, days: newDays })
    },
    [value, onChange]
  )

  const handleTimeChange = useCallback(
    (field: 'startTime' | 'endTime', newValue: string) => {
      onChange({ ...value, [field]: newValue })
    },
    [value, onChange]
  )

  return (
    <Stack gap={4}>
      {/* Дни недели */}
      <HStack gap={2} flexWrap="wrap">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = value.days.includes(day.value)
          return (
            <Box
              key={day.value}
              as="button"
              onClick={() => handleDayChange(day.value, !isSelected)}
              px={4}
              py={2}
              borderRadius="lg"
              borderWidth="2px"
              borderColor={isSelected ? 'brand.solid' : 'border'}
              bg={isSelected ? 'brand.subtle' : 'bg'}
              color={isSelected ? 'brand.fg' : 'fg'}
              fontWeight="medium"
              cursor={disabled ? 'not-allowed' : 'pointer'}
              opacity={disabled ? 0.5 : 1}
              transition="all 0.2s"
              _hover={disabled ? {} : { borderColor: 'brand.solid' }}
              title={day.fullLabel}
              aria-pressed={isSelected}
              aria-disabled={disabled}
            >
              {day.label}
            </Box>
          )
        })}
      </HStack>

      {/* Время работы */}
      <HStack gap={2} align="center">
        <Input
          type="time"
          value={value.startTime}
          onChange={(e) => handleTimeChange('startTime', e.target.value)}
          disabled={disabled}
          width="140px"
        />
        <Text color="fg.muted">—</Text>
        <Input
          type="time"
          value={value.endTime}
          onChange={(e) => handleTimeChange('endTime', e.target.value)}
          disabled={disabled}
          width="140px"
        />
      </HStack>

      {/* Превью */}
      {value.days.length > 0 && (
        <Box p={3} borderRadius="lg" bg="bg.subtle" borderWidth="1px" borderColor="border">
          <Text fontSize="sm" color="fg.muted">
            {value.days.map((day) => DAYS_OF_WEEK.find((d) => d.value === day)?.label).join(', ')}
            {' • '}
            {value.startTime} - {value.endTime}
          </Text>
        </Box>
      )}
    </Stack>
  )
})

/** Дни по умолчанию (будни) */
export const DEFAULT_WORKING_DAYS: DayOfWeekEnum[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

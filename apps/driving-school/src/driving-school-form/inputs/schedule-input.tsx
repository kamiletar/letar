'use client'

import { Box, Button, HStack, Input, Stack, Text } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'

// Типы для расписания
export interface TimeSlot {
  open: string
  close: string
}

export type DaySchedule = TimeSlot | null

export interface WeeklySchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export type DayOfWeek = keyof WeeklySchedule

// Конфигурация дней недели
const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_DAY_NAMES: Record<DayOfWeek, string> = {
  monday: 'Пн',
  tuesday: 'Вт',
  wednesday: 'Ср',
  thursday: 'Чт',
  friday: 'Пт',
  saturday: 'Сб',
  sunday: 'Вс',
}

const DEFAULT_WORKING_HOURS: WeeklySchedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: null,
  sunday: null,
}

/**
 * Проверяет, что время окончания позже времени начала
 */
function isValidTimeRange(open: string, close: string): boolean {
  const [openH, openM] = open.split(':').map(Number)
  const [closeH, closeM] = close.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM
  return closeMinutes > openMinutes
}

export interface ScheduleInputProps {
  value: WeeklySchedule
  onChange: (value: WeeklySchedule) => void
  disabled?: boolean
  /**
   * Пользовательские названия дней (для локализации)
   */
  dayNames?: Partial<Record<DayOfWeek, string>>
  /**
   * Дни для отображения (подмножество всех дней)
   * @default все дни
   */
  days?: DayOfWeek[]
  /**
   * Показывать кнопку "скопировать на будни"
   * @default true
   */
  showCopyToWeekdays?: boolean
  /**
   * Метка для состояния "выходной"
   * @default 'Выходной'
   */
  offLabel?: string
  /**
   * Текст кнопки копирования на будни
   * @default 'Скопировать Пн на будни'
   */
  copyToWeekdaysLabel?: string
  /**
   * Время начала по умолчанию при включении дня
   */
  defaultOpenTime?: string
  /**
   * Время окончания по умолчанию при включении дня
   */
  defaultCloseTime?: string
}

/**
 * Самостоятельный компонент ввода расписания рабочих часов
 *
 * @example
 * ```tsx
 * <ScheduleInput
 *   value={schedule}
 *   onChange={setSchedule}
 * />
 * ```
 */
export const ScheduleInput = memo(function ScheduleInput({
  value,
  onChange,
  disabled,
  dayNames = {},
  days = DAYS_OF_WEEK,
  showCopyToWeekdays = true,
  offLabel = 'Выходной',
  copyToWeekdaysLabel = 'Скопировать Пн на будни',
  defaultOpenTime = '09:00',
  defaultCloseTime = '18:00',
}: ScheduleInputProps) {
  const schedule = value || DEFAULT_WORKING_HOURS
  const mergedDayNames = { ...DEFAULT_DAY_NAMES, ...dayNames }

  // Проверка на некорректные временные диапазоны
  const invalidDays = useMemo(() => {
    const invalid: DayOfWeek[] = []
    for (const day of days) {
      const daySchedule = schedule[day]
      if (daySchedule && !isValidTimeRange(daySchedule.open, daySchedule.close)) {
        invalid.push(day)
      }
    }
    return invalid
  }, [schedule, days])

  const handleDayToggle = useCallback(
    (day: DayOfWeek, enabled: boolean) => {
      const newSchedule = {
        ...schedule,
        [day]: enabled ? { open: defaultOpenTime, close: defaultCloseTime } : null,
      }
      onChange(newSchedule)
    },
    [schedule, onChange, defaultOpenTime, defaultCloseTime]
  )

  const handleTimeChange = useCallback(
    (day: DayOfWeek, timeField: 'open' | 'close', newValue: string) => {
      const current = schedule[day]
      if (!current) {
        return
      }
      const newSchedule = {
        ...schedule,
        [day]: { ...current, [timeField]: newValue },
      }
      onChange(newSchedule)
    },
    [schedule, onChange]
  )

  const handleCopyToWeekdays = useCallback(() => {
    const mondaySchedule = schedule.monday
    if (!mondaySchedule) {
      return
    }
    const newSchedule = {
      ...schedule,
      monday: mondaySchedule,
      tuesday: mondaySchedule,
      wednesday: mondaySchedule,
      thursday: mondaySchedule,
      friday: mondaySchedule,
    }
    onChange(newSchedule)
  }, [schedule, onChange])

  return (
    <Stack gap={3}>
      {/* Invalid time range warning */}
      {invalidDays.length > 0 && (
        <Box p={3} bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md">
          <Text color="red.600" fontSize="sm" fontWeight="medium">
            Время окончания должно быть позже начала: {invalidDays.map((d) => mergedDayNames[d]).join(', ')}
          </Text>
        </Box>
      )}

      {/* Quick actions */}
      {showCopyToWeekdays && days.includes('monday') && (
        <HStack gap={2} flexWrap="wrap">
          <Text fontSize="sm" color="fg.muted">
            Быстрые действия:
          </Text>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            colorPalette="blue"
            onClick={handleCopyToWeekdays}
            disabled={disabled || !schedule.monday}
          >
            {copyToWeekdaysLabel}
          </Button>
        </HStack>
      )}

      {/* Days list */}
      {days.map((day) => {
        const daySchedule = schedule[day]
        const isEnabled = daySchedule !== null && daySchedule !== undefined
        const dayHasError = invalidDays.includes(day)

        return (
          <Box
            key={day}
            data-day={day}
            p={3}
            bg={dayHasError ? 'red.50' : isEnabled ? 'bg.panel' : 'bg.muted'}
            borderRadius="md"
            borderWidth={dayHasError ? '2px' : '1px'}
            borderColor={dayHasError ? 'red.300' : 'border.muted'}
          >
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              {/* Day and toggle */}
              <HStack gap={3} minW="100px">
                {/* Native checkbox styled as switch to avoid Chakra Switch bug in loops */}
                <Box
                  as="label"
                  display="inline-flex"
                  alignItems="center"
                  cursor={disabled ? 'not-allowed' : 'pointer'}
                  position="relative"
                  opacity={disabled ? 0.4 : 1}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => handleDayToggle(day, e.target.checked)}
                    disabled={disabled}
                    data-switch={day}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: 0,
                      height: 0,
                    }}
                  />
                  <Box
                    w="36px"
                    h="20px"
                    bg={isEnabled ? 'green.500' : 'gray.300'}
                    borderRadius="full"
                    position="relative"
                    transition="background 0.2s"
                  >
                    <Box
                      position="absolute"
                      top="2px"
                      left={isEnabled ? '18px' : '2px'}
                      w="16px"
                      h="16px"
                      bg="white"
                      borderRadius="full"
                      transition="left 0.2s"
                      boxShadow="sm"
                    />
                  </Box>
                </Box>
                <Text fontWeight="medium" color={isEnabled ? 'fg' : 'fg.muted'}>
                  {mergedDayNames[day]}
                </Text>
              </HStack>

              {/* Time inputs */}
              {isEnabled ? (
                <HStack gap={2}>
                  <Input
                    type="time"
                    size="sm"
                    width="120px"
                    value={daySchedule?.open || defaultOpenTime}
                    onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                    disabled={disabled}
                    bg="bg"
                    color="fg"
                    borderColor={dayHasError ? 'red.300' : undefined}
                  />
                  <Text color="fg.muted">—</Text>
                  <Input
                    type="time"
                    size="sm"
                    width="120px"
                    value={daySchedule?.close || defaultCloseTime}
                    onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                    disabled={disabled}
                    bg="bg"
                    color="fg"
                    borderColor={dayHasError ? 'red.300' : undefined}
                  />
                </HStack>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  {offLabel}
                </Text>
              )}
            </HStack>
          </Box>
        )
      })}
    </Stack>
  )
})

/** Расписание рабочих часов по умолчанию (Пн-Пт 9:00-18:00) */
export { DEFAULT_WORKING_HOURS }

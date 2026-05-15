'use client'

import {
  DAY_NAMES,
  type DayOfWeek,
  DAYS_OF_WEEK,
  DEFAULT_WORKING_HOURS,
  type WorkingHoursSchedule,
} from '@/lib/working-hours'
import { Box, HStack, Input, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Проверяет, что время окончания больше времени начала
 */
function isValidTimeRange(open: string, close: string): boolean {
  const [openH, openM] = open.split(':').map(Number)
  const [closeH, closeM] = close.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM
  return closeMinutes > openMinutes
}

interface WorkingHoursEditorProps {
  name: string
  defaultValue?: WorkingHoursSchedule | null
  onChange?: (value: WorkingHoursSchedule) => void
}

// Генерация списка времени с шагом 30 минут
function generateTimeOptions(): string[] {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }
  return times
}

const TIME_OPTIONS = generateTimeOptions()

/**
 * Компонент редактирования часов работы по дням недели
 */
export function WorkingHoursEditor({ name, defaultValue, onChange }: WorkingHoursEditorProps) {
  const [schedule, setSchedule] = useState<WorkingHoursSchedule>(() => {
    return defaultValue || DEFAULT_WORKING_HOURS
  })

  // Синхронизируем с onChange
  useEffect(() => {
    onChange?.(schedule)
  }, [schedule, onChange])

  const handleDayToggle = useCallback((day: DayOfWeek, enabled: boolean) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: enabled ? { open: '09:00', close: '18:00' } : null,
    }))
  }, [])

  const handleTimeChange = useCallback((day: DayOfWeek, field: 'open' | 'close', value: string) => {
    setSchedule((prev) => {
      const current = prev[day]
      if (!current) {
        return prev
      }
      return {
        ...prev,
        [day]: { ...current, [field]: value },
      }
    })
  }, [])

  // Проверяем, есть ли ошибки в расписании
  const invalidDays = useMemo(() => {
    const invalid: DayOfWeek[] = []
    for (const day of DAYS_OF_WEEK) {
      const daySchedule = schedule[day]
      if (daySchedule && !isValidTimeRange(daySchedule.open, daySchedule.close)) {
        invalid.push(day)
      }
    }
    return invalid
  }, [schedule])

  // Применить к будням
  const applyToWeekdays = useCallback(() => {
    const mondaySchedule = schedule.monday
    if (!mondaySchedule) {
      return
    }

    setSchedule((prev) => ({
      ...prev,
      monday: mondaySchedule,
      tuesday: mondaySchedule,
      wednesday: mondaySchedule,
      thursday: mondaySchedule,
      friday: mondaySchedule,
    }))
  }, [schedule.monday])

  return (
    <Stack gap={3}>
      {/* Скрытый input с JSON для формы */}
      <input type="hidden" name={name} value={JSON.stringify(schedule)} />

      {/* Предупреждение об ошибках */}
      {invalidDays.length > 0 && (
        <Box layerStyle="panel.error" p={3} borderRadius="md">
          <Text color="error.fg" fontSize="sm" fontWeight="medium">
            Время окончания должно быть позже времени начала: {invalidDays.map((d) => DAY_NAMES[d]).join(', ')}
          </Text>
        </Box>
      )}

      {/* Быстрые действия */}
      <HStack gap={2} flexWrap="wrap">
        <Text fontSize="sm" color="fg.muted">
          Быстрые действия:
        </Text>
        <button
          type="button"
          style={{
            fontSize: '0.875rem',
            color: 'var(--chakra-colors-blue-500)',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
          onClick={applyToWeekdays}
        >
          Скопировать Пн на будни
        </button>
      </HStack>

      {/* Список дней */}
      {DAYS_OF_WEEK.map((day) => {
        const daySchedule = schedule[day]
        const isEnabled = daySchedule !== null && daySchedule !== undefined
        const hasError = invalidDays.includes(day)

        return (
          <Box
            key={day}
            p={3}
            bg={hasError ? 'error.subtle' : isEnabled ? 'bg.panel' : 'bg.muted'}
            borderRadius="md"
            borderWidth={hasError ? '2px' : '1px'}
            borderColor={hasError ? 'error.border' : 'border.muted'}
          >
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              {/* День и переключатель */}
              <HStack gap={3} minW="140px">
                <Box as="label" display="inline-flex" alignItems="center" cursor="pointer" position="relative">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => handleDayToggle(day, e.target.checked)}
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
                  {DAY_NAMES[day]}
                </Text>
              </HStack>

              {/* Время работы */}
              {isEnabled ? (
                <HStack gap={2}>
                  <Input
                    type="time"
                    size="sm"
                    width="120px"
                    value={daySchedule?.open || '09:00'}
                    onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                    list={`time-options-${day}-open`}
                  />
                  <Text color="fg.muted">—</Text>
                  <Input
                    type="time"
                    size="sm"
                    width="120px"
                    value={daySchedule?.close || '18:00'}
                    onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                    list={`time-options-${day}-close`}
                  />
                  {/* Datalists для удобного выбора */}
                  <datalist id={`time-options-${day}-open`}>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  <datalist id={`time-options-${day}-close`}>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </HStack>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  Выходной
                </Text>
              )}
            </HStack>
          </Box>
        )
      })}
    </Stack>
  )
}

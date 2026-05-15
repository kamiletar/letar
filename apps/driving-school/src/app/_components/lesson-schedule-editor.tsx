'use client'

import {
  DAY_NAMES,
  type DayOfWeek,
  DAYS_OF_WEEK,
  DEFAULT_LESSON_SCHEDULE,
  formatDuration,
  type LessonSchedule,
} from '@/lib/lesson-schedule'
import { Box, HStack, Input, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

interface LessonScheduleEditorProps {
  name: string
  defaultValue?: LessonSchedule | null
  defaultDuration?: number // дефолтная длительность для новых дней
  onChange?: (value: LessonSchedule) => void
}

/**
 * Компонент редактирования расписания занятий по дням недели
 * Позволяет задавать время начала и длительность для каждого дня
 */
export function LessonScheduleEditor({
  name,
  defaultValue,
  defaultDuration = 120,
  onChange,
}: LessonScheduleEditorProps) {
  const [schedule, setSchedule] = useState<LessonSchedule>(() => {
    return defaultValue || DEFAULT_LESSON_SCHEDULE
  })

  // Синхронизируем с onChange
  useEffect(() => {
    onChange?.(schedule)
  }, [schedule, onChange])

  const handleDayToggle = useCallback(
    (day: DayOfWeek, enabled: boolean) => {
      setSchedule((prev) => ({
        ...prev,
        [day]: enabled ? { startTime: '10:00', duration: defaultDuration } : null,
      }))
    },
    [defaultDuration]
  )

  const handleTimeChange = useCallback((day: DayOfWeek, value: string) => {
    setSchedule((prev) => {
      const current = prev[day]
      if (!current) {
        return prev
      }
      return {
        ...prev,
        [day]: { ...current, startTime: value },
      }
    })
  }, [])

  const handleDurationChange = useCallback((day: DayOfWeek, value: number) => {
    setSchedule((prev) => {
      const current = prev[day]
      if (!current) {
        return prev
      }
      return {
        ...prev,
        [day]: { ...current, duration: value },
      }
    })
  }, [])

  // Применить к будням
  const applyToWeekdays = useCallback(() => {
    const mondaySchedule = schedule.monday
    if (!mondaySchedule) {
      return
    }

    setSchedule((prev) => ({
      ...prev,
      monday: mondaySchedule,
      tuesday: { ...mondaySchedule },
      wednesday: { ...mondaySchedule },
      thursday: { ...mondaySchedule },
      friday: { ...mondaySchedule },
    }))
  }, [schedule.monday])

  // Подсчёт общего времени
  const totalMinutes = DAYS_OF_WEEK.reduce((sum, day) => sum + (schedule[day]?.duration || 0), 0)

  return (
    <Stack gap={3}>
      {/* Скрытый input с JSON для формы */}
      <input type="hidden" name={name} value={JSON.stringify(schedule)} />

      {/* Быстрые действия и статистика */}
      <HStack gap={4} flexWrap="wrap" justify="space-between">
        <HStack gap={2}>
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
        <Text fontSize="sm" color="fg.muted">
          Всего: {formatDuration(totalMinutes)} в неделю
        </Text>
      </HStack>

      {/* Список дней */}
      {DAYS_OF_WEEK.map((day) => {
        const daySchedule = schedule[day]
        const isEnabled = daySchedule !== null && daySchedule !== undefined

        return (
          <Box
            key={day}
            p={3}
            bg={isEnabled ? 'bg.panel' : 'bg.muted'}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border.muted"
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

              {/* Время и длительность */}
              {isEnabled ? (
                <HStack gap={3} flexWrap="wrap">
                  <HStack gap={2}>
                    <Text fontSize="sm" color="fg.muted">
                      Начало:
                    </Text>
                    <Input
                      type="time"
                      size="sm"
                      width="110px"
                      value={daySchedule?.startTime || '10:00'}
                      onChange={(e) => handleTimeChange(day, e.target.value)}
                    />
                  </HStack>
                  <HStack gap={2}>
                    <Text fontSize="sm" color="fg.muted">
                      Длит.:
                    </Text>
                    <Input
                      type="number"
                      size="sm"
                      width="80px"
                      min={30}
                      max={480}
                      step={15}
                      value={daySchedule?.duration || defaultDuration}
                      onChange={(e) => handleDurationChange(day, parseInt(e.target.value) || defaultDuration)}
                    />
                    <Text fontSize="sm" color="fg.muted">
                      мин
                    </Text>
                  </HStack>
                </HStack>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  Нет занятий
                </Text>
              )}
            </HStack>
          </Box>
        )
      })}
    </Stack>
  )
}

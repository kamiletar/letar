'use client'

import { updateCronSchedule } from '@/app/_actions/cron-actions'
import { Button } from '@/app/_components/ui/button'
import { toaster } from '@/app/_components/ui/toaster'
import {
  Badge,
  Box,
  createListCollection,
  Dialog,
  Flex,
  HStack,
  Input,
  Portal,
  Select,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { LuCalendar, LuCheck, LuX } from 'react-icons/lu'

interface CronScheduleDialogProps {
  jobId: string | null
  jobName: string
  currentSchedule: string
  serverId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ValidationResult {
  valid: boolean
  description?: string
  nextRuns?: string[]
  error?: string
}

// Предустановленные расписания
const PRESETS = [
  { value: '* * * * *', label: 'Каждую минуту' },
  { value: '*/5 * * * *', label: 'Каждые 5 минут' },
  { value: '*/15 * * * *', label: 'Каждые 15 минут' },
  { value: '0 * * * *', label: 'Каждый час' },
  { value: '0 */2 * * *', label: 'Каждые 2 часа' },
  { value: '0 */6 * * *', label: 'Каждые 6 часов' },
  { value: '0 0 * * *', label: 'Ежедневно в полночь' },
  { value: '0 9 * * *', label: 'Ежедневно в 9:00' },
  { value: '0 0 * * 0', label: 'Каждое воскресенье' },
  { value: '0 0 1 * *', label: 'Первое число месяца' },
]

// Опции для селектов
const MINUTES = ['*', '0', '5', '10', '15', '20', '30', '45', '*/5', '*/10', '*/15', '*/30']
const HOURS = ['*', '0', '1', '2', '3', '6', '9', '12', '15', '18', '21', '*/2', '*/6']
const DAYS_OF_MONTH = ['*', '1', '15', '28', '*/2']
const MONTHS = ['*', '1', '3', '6', '9', '12']
const DAYS_OF_WEEK = [
  { value: '*', label: 'Любой' },
  { value: '0', label: 'Воскресенье' },
  { value: '1', label: 'Понедельник' },
  { value: '2', label: 'Вторник' },
  { value: '3', label: 'Среда' },
  { value: '4', label: 'Четверг' },
  { value: '5', label: 'Пятница' },
  { value: '6', label: 'Суббота' },
  { value: '1-5', label: 'Будни' },
  { value: '0,6', label: 'Выходные' },
]

// Создаём коллекции для Select
const minuteCollection = createListCollection({
  items: MINUTES.map((v) => ({ value: v, label: v })),
})
const hourCollection = createListCollection({
  items: HOURS.map((v) => ({ value: v, label: v })),
})
const dayOfMonthCollection = createListCollection({
  items: DAYS_OF_MONTH.map((v) => ({ value: v, label: v })),
})
const monthCollection = createListCollection({
  items: MONTHS.map((v) => ({ value: v, label: v })),
})
const dayOfWeekCollection = createListCollection({
  items: DAYS_OF_WEEK,
})
const presetCollection = createListCollection({
  items: PRESETS.map((p) => ({ value: p.value, label: p.label })),
})

export function CronScheduleDialog({
  jobId,
  jobName,
  currentSchedule,
  serverId,
  open,
  onOpenChange,
}: CronScheduleDialogProps) {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Состояние
  const [schedule, setSchedule] = useState(currentSchedule)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Парсим текущее расписание в части
  const parts = schedule.split(' ')
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts.length === 5 ? parts : ['*', '*', '*', '*', '*']

  // Валидация при изменении расписания
  const validateSchedule = useCallback(async (expr: string) => {
    setIsValidating(true)
    try {
      const res = await fetch('/api/cron/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: expr }),
      })
      const data = await res.json()
      setValidation(data)
    } catch {
      setValidation({ valid: false, error: 'Ошибка валидации' })
    } finally {
      setIsValidating(false)
    }
  }, [])

  // Валидируем при открытии и изменении
  useEffect(() => {
    if (open && schedule) {
      validateSchedule(schedule)
    }
  }, [open, schedule, validateSchedule])

  // Сброс при открытии
  useEffect(() => {
    if (open) {
      setSchedule(currentSchedule)
    }
  }, [open, currentSchedule])

  // Обновление части расписания
  const updatePart = (index: number, value: string) => {
    const newParts = schedule.split(' ')
    if (newParts.length !== 5) {
      return
    }
    newParts[index] = value
    setSchedule(newParts.join(' '))
  }

  // Сохранение
  const handleSave = () => {
    if (!jobId || !validation?.valid) {
      return
    }

    startTransition(async () => {
      const result = await updateCronSchedule(jobId, schedule, serverId)

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['cron-jobs', serverId] })
        toaster.create({
          title: 'Расписание обновлено',
          description: validation.description,
          type: 'success',
        })
        onOpenChange(false)
      } else {
        toaster.create({
          title: 'Ошибка',
          description: result.error,
          type: 'error',
        })
      }
    })
  }

  // Форматирование даты
  const formatNextRun = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="lg">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Расписание: {jobName}</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap="6" align="stretch">
                {/* Предустановки */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb="2">
                    Быстрый выбор
                  </Text>
                  <Select.Root
                    collection={presetCollection}
                    value={PRESETS.find((p) => p.value === schedule) ? [schedule] : []}
                    onValueChange={(e) => e.value[0] && setSchedule(e.value[0])}
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="Выберите шаблон..." />
                    </Select.Trigger>
                    <Portal>
                      <Select.Positioner>
                        <Select.Content>
                          {presetCollection.items.map((item) => (
                            <Select.Item key={item.value} item={item}>
                              {item.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Portal>
                  </Select.Root>
                </Box>

                {/* Визуальный конструктор */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb="2">
                    Конструктор
                  </Text>
                  <Flex gap="2" wrap="wrap">
                    {/* Минута */}
                    <Box flex="1" minW="100px">
                      <Text fontSize="xs" color="fg.muted" mb="1">
                        Минута
                      </Text>
                      <Select.Root
                        collection={minuteCollection}
                        value={[minute]}
                        onValueChange={(e) => e.value[0] && updatePart(0, e.value[0])}
                        size="sm"
                      >
                        <Select.Trigger>
                          <Select.ValueText />
                        </Select.Trigger>
                        <Portal>
                          <Select.Positioner>
                            <Select.Content>
                              {minuteCollection.items.map((item) => (
                                <Select.Item key={item.value} item={item}>
                                  {item.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Portal>
                      </Select.Root>
                    </Box>

                    {/* Час */}
                    <Box flex="1" minW="100px">
                      <Text fontSize="xs" color="fg.muted" mb="1">
                        Час
                      </Text>
                      <Select.Root
                        collection={hourCollection}
                        value={[hour]}
                        onValueChange={(e) => e.value[0] && updatePart(1, e.value[0])}
                        size="sm"
                      >
                        <Select.Trigger>
                          <Select.ValueText />
                        </Select.Trigger>
                        <Portal>
                          <Select.Positioner>
                            <Select.Content>
                              {hourCollection.items.map((item) => (
                                <Select.Item key={item.value} item={item}>
                                  {item.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Portal>
                      </Select.Root>
                    </Box>

                    {/* День месяца */}
                    <Box flex="1" minW="100px">
                      <Text fontSize="xs" color="fg.muted" mb="1">
                        День
                      </Text>
                      <Select.Root
                        collection={dayOfMonthCollection}
                        value={[dayOfMonth]}
                        onValueChange={(e) => e.value[0] && updatePart(2, e.value[0])}
                        size="sm"
                      >
                        <Select.Trigger>
                          <Select.ValueText />
                        </Select.Trigger>
                        <Portal>
                          <Select.Positioner>
                            <Select.Content>
                              {dayOfMonthCollection.items.map((item) => (
                                <Select.Item key={item.value} item={item}>
                                  {item.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Portal>
                      </Select.Root>
                    </Box>

                    {/* Месяц */}
                    <Box flex="1" minW="100px">
                      <Text fontSize="xs" color="fg.muted" mb="1">
                        Месяц
                      </Text>
                      <Select.Root
                        collection={monthCollection}
                        value={[month]}
                        onValueChange={(e) => e.value[0] && updatePart(3, e.value[0])}
                        size="sm"
                      >
                        <Select.Trigger>
                          <Select.ValueText />
                        </Select.Trigger>
                        <Portal>
                          <Select.Positioner>
                            <Select.Content>
                              {monthCollection.items.map((item) => (
                                <Select.Item key={item.value} item={item}>
                                  {item.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Portal>
                      </Select.Root>
                    </Box>

                    {/* День недели */}
                    <Box flex="1" minW="120px">
                      <Text fontSize="xs" color="fg.muted" mb="1">
                        День недели
                      </Text>
                      <Select.Root
                        collection={dayOfWeekCollection}
                        value={[dayOfWeek]}
                        onValueChange={(e) => e.value[0] && updatePart(4, e.value[0])}
                        size="sm"
                      >
                        <Select.Trigger>
                          <Select.ValueText />
                        </Select.Trigger>
                        <Portal>
                          <Select.Positioner>
                            <Select.Content>
                              {dayOfWeekCollection.items.map((item) => (
                                <Select.Item key={item.value} item={item}>
                                  {item.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Portal>
                      </Select.Root>
                    </Box>
                  </Flex>
                </Box>

                {/* Ручной ввод */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb="2">
                    Cron выражение
                  </Text>
                  <Input
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    fontFamily="mono"
                    placeholder="* * * * *"
                  />
                  <Text fontSize="xs" color="fg.muted" mt="1">
                    Формат: минута час день месяц день_недели
                  </Text>
                </Box>

                {/* Статус валидации */}
                <Box>
                  {isValidating ? (
                    <HStack gap="2">
                      <Spinner size="sm" />
                      <Text fontSize="sm" color="fg.muted">
                        Проверка...
                      </Text>
                    </HStack>
                  ) : validation ? (
                    <VStack align="stretch" gap="3">
                      <HStack>
                        <Badge colorPalette={validation.valid ? 'green' : 'red'} size="sm">
                          {validation.valid ? <LuCheck /> : <LuX />}
                          {validation.valid ? 'Корректно' : 'Ошибка'}
                        </Badge>
                        {validation.description && (
                          <Text fontSize="sm" color="fg.muted">
                            {validation.description}
                          </Text>
                        )}
                      </HStack>

                      {validation.error && (
                        <Text fontSize="sm" color="red.500">
                          {validation.error}
                        </Text>
                      )}

                      {validation.valid && validation.nextRuns && validation.nextRuns.length > 0 && (
                        <Box>
                          <HStack gap="1" mb="2">
                            <LuCalendar size={14} />
                            <Text fontSize="sm" fontWeight="medium">
                              Следующие запуски:
                            </Text>
                          </HStack>
                          <VStack align="stretch" gap="1">
                            {validation.nextRuns.map((run, i) => (
                              <Text key={`run-${i}`} fontSize="sm" color="fg.muted" fontFamily="mono">
                                {formatNextRun(run)}
                              </Text>
                            ))}
                          </VStack>
                        </Box>
                      )}
                    </VStack>
                  ) : null}
                </Box>
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button
                colorPalette="blue"
                onClick={handleSave}
                loading={isPending}
                disabled={!validation?.valid || schedule === currentSchedule}
              >
                Сохранить
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

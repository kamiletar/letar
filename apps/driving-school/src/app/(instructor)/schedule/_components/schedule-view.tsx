'use client'

import { HorizontalDatePicker } from '@/app/_components/horizontal-date-picker'
import { toaster } from '@/app/_components/ui/toaster'
import { Avatar, Badge, Box, Button, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { LuClock, LuLoader, LuLock, LuLockOpen, LuSettings } from 'react-icons/lu'
import { type TimeSlotWithLesson, toggleSlotStatus } from '../_actions/schedule.action'

// Форматирование времени
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Компонент карточки слота
function SlotCard({
  slot,
  onToggle,
  isToggling,
}: {
  slot: TimeSlotWithLesson
  onToggle: (slotId: string) => void
  isToggling: boolean
}) {
  const statusColors: Record<string, 'green' | 'blue' | 'gray'> = {
    AVAILABLE: 'green',
    BOOKED: 'blue',
    BLOCKED: 'gray',
  }

  const statusLabels: Record<string, string> = {
    AVAILABLE: 'Свободен',
    BOOKED: 'Занят',
    BLOCKED: 'Заблокирован',
  }

  const canToggle = slot.status !== 'BOOKED'

  return (
    <Box
      bg="bg.panel"
      p={4}
      borderRadius="lg"
      shadow="sm"
      borderWidth="1px"
      borderLeftWidth="4px"
      borderLeftColor={
        slot.status === 'BOOKED' ? 'info.solid' : slot.status === 'AVAILABLE' ? 'success.solid' : 'gray.solid'
      }
    >
      <VStack gap={2} align="stretch">
        <HStack justify="space-between">
          <HStack gap={2}>
            <LuClock size={14} />
            <Text fontWeight="semibold">
              {formatTime(slot.startTime)} — {formatTime(slot.endTime)}
            </Text>
          </HStack>
          <Badge colorPalette={statusColors[slot.status]} size="sm">
            {statusLabels[slot.status]}
          </Badge>
        </HStack>

        {slot.lesson && (
          <HStack gap={2} pt={2} borderTopWidth="1px">
            <Avatar.Root size="sm">
              {slot.lesson.student.user.image && <Avatar.Image src={slot.lesson.student.user.image} />}
              <Avatar.Fallback>{slot.lesson.student.user.name?.charAt(0) || '?'}</Avatar.Fallback>
            </Avatar.Root>
            <Box flex={1}>
              <Text fontSize="sm" fontWeight="medium">
                {slot.lesson.student.user.name || 'Без имени'}
              </Text>
              {slot.lesson.lessonType && (
                <Text fontSize="xs" color="fg.muted">
                  {slot.lesson.lessonType.name}
                </Text>
              )}
            </Box>
          </HStack>
        )}

        {/* Кнопка блокировки/разблокировки */}
        {canToggle && (
          <Button
            size="sm"
            variant={slot.status === 'AVAILABLE' ? 'outline' : 'solid'}
            colorPalette={slot.status === 'AVAILABLE' ? 'gray' : 'green'}
            onClick={() => onToggle(slot.id)}
            disabled={isToggling}
            mt={1}
          >
            {isToggling ? (
              <LuLoader className="animate-spin" />
            ) : slot.status === 'AVAILABLE' ? (
              <LuLock />
            ) : (
              <LuLockOpen />
            )}
            {slot.status === 'AVAILABLE' ? 'Заблокировать' : 'Разблокировать'}
          </Button>
        )}
      </VStack>
    </Box>
  )
}

interface ScheduleViewProps {
  slots: TimeSlotWithLesson[]
}

/**
 * Интерактивный вид расписания с горизонтальным выбором даты.
 */
export function ScheduleView({ slots }: ScheduleViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [togglingSlotId, setTogglingSlotId] = useState<string | null>(null)

  // Получаем уникальные даты из слотов
  const uniqueDates = useMemo(() => {
    const dateMap = new Map<string, Date>()
    slots.forEach((slot) => {
      const date = new Date(slot.startTime)
      const key = date.toDateString()
      if (!dateMap.has(key)) {
        dateMap.set(key, date)
      }
    })
    return Array.from(dateMap.values()).sort((a, b) => a.getTime() - b.getTime())
  }, [slots])

  // Выбранная дата (по умолчанию — первая или сегодня если есть)
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date()
    const todaySlots = uniqueDates.find(
      (d) =>
        d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    )
    return todaySlots || uniqueDates[0] || null
  })

  // Обработчик блокировки/разблокировки слота
  const handleToggleSlot = (slotId: string) => {
    setTogglingSlotId(slotId)
    startTransition(async () => {
      const result = await toggleSlotStatus(slotId)

      if (result.success) {
        toaster.success({
          title: result.newStatus === 'BLOCKED' ? 'Слот заблокирован' : 'Слот разблокирован',
        })
        router.refresh()
      } else {
        const errorMessages: Record<string, string> = {
          NOT_FOUND: 'Слот не найден',
          CANNOT_BLOCK_BOOKED: 'Нельзя заблокировать занятый слот',
          UNAUTHORIZED: 'Необходима авторизация',
          NOT_INSTRUCTOR: 'Доступно только инструкторам',
          UNKNOWN_ERROR: 'Произошла ошибка',
        }
        toaster.error({
          title: 'Ошибка',
          description: errorMessages[result.error] || result.error,
        })
      }
      setTogglingSlotId(null)
    })
  }

  // Фильтрация слотов по выбранной дате
  const filteredSlots = useMemo(() => {
    if (!selectedDate) {
      return []
    }
    return slots.filter((slot) => {
      const slotDate = new Date(slot.startTime)
      return (
        slotDate.getDate() === selectedDate.getDate() &&
        slotDate.getMonth() === selectedDate.getMonth() &&
        slotDate.getFullYear() === selectedDate.getFullYear()
      )
    })
  }, [slots, selectedDate])

  // Статистика по выбранному дню
  const stats = useMemo(
    () => ({
      available: filteredSlots.filter((s) => s.status === 'AVAILABLE').length,
      booked: filteredSlots.filter((s) => s.status === 'BOOKED').length,
      blocked: filteredSlots.filter((s) => s.status === 'BLOCKED').length,
    }),
    [filteredSlots]
  )

  if (uniqueDates.length === 0) {
    return (
      <Box bg="bg.muted" p={8} borderRadius="lg" textAlign="center">
        <Text color="fg.muted" mb={4}>
          Нет слотов на эту неделю
        </Text>
        <Button asChild colorPalette="brand">
          <Link href="/schedule/settings">
            <LuSettings size={16} />
            Настроить расписание
          </Link>
        </Button>
      </Box>
    )
  }

  return (
    <VStack gap={4} align="stretch">
      {/* Горизонтальный выбор даты */}
      <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" p={2}>
        <HorizontalDatePicker dates={uniqueDates} selectedDate={selectedDate} onDateSelect={setSelectedDate} />
      </Box>

      {/* Статистика по выбранному дню */}
      <HStack gap={4} wrap="wrap">
        <Box layerStyle="panel.success">
          <Text fontSize="sm" color="success.fg">
            Свободно: <strong>{stats.available}</strong>
          </Text>
        </Box>
        <Box layerStyle="panel.info">
          <Text fontSize="sm" color="info.fg">
            Занято: <strong>{stats.booked}</strong>
          </Text>
        </Box>
        <Box bg="bg.subtle" px={4} py={2} borderRadius="md">
          <Text fontSize="sm" color="fg.muted">
            Заблокировано: <strong>{stats.blocked}</strong>
          </Text>
        </Box>
      </HStack>

      {/* Слоты выбранного дня */}
      {filteredSlots.length > 0 ? (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={3}>
          {filteredSlots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              onToggle={handleToggleSlot}
              isToggling={isPending && togglingSlotId === slot.id}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Box bg="bg.muted" p={6} borderRadius="lg" textAlign="center">
          <Text color="fg.muted">Нет слотов на выбранный день</Text>
        </Box>
      )}
    </VStack>
  )
}

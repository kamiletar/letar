'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { fireCelebration } from '@/app/_utils/confetti'
import { Badge, Button, Card, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useOptimistic, useTransition } from 'react'
import { LuCalendar, LuCheck, LuClock } from 'react-icons/lu'
import { bookLessonAction, type SlotForBooking } from '../_actions/schedule.action'

interface SlotCardProps {
  slot: SlotForBooking
  instructorUserId: string
  selectedLessonTypeId?: string
  selectedPricingOptionId?: string
  disabled?: boolean
}

type BookingState = 'available' | 'booking' | 'booked'

export function SlotCard({
  slot,
  instructorUserId,
  selectedLessonTypeId,
  selectedPricingOptionId,
  disabled,
}: SlotCardProps) {
  const [isPending, startTransition] = useTransition()
  // Оптимистичное состояние бронирования
  const [optimisticState, setOptimisticState] = useOptimistic<BookingState>('available')

  const startTime = new Date(slot.startTime)
  const endTime = new Date(slot.endTime)

  const dateStr = startTime.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const timeStr = `${startTime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endTime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })}`

  const handleBook = () => {
    startTransition(async () => {
      // Мгновенно показываем "Заявка отправлена"
      setOptimisticState('booked')

      const result = await bookLessonAction(slot.id, instructorUserId, selectedLessonTypeId, selectedPricingOptionId)
      if (result.success) {
        // Celebration эффект при успешном бронировании
        fireCelebration()
        toaster.success({
          title: 'Заявка отправлена',
          description: 'Ожидайте подтверждения от инструктора',
        })
      } else {
        // При ошибке состояние автоматически откатится к 'available'
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
      }
    })
  }

  const isBooked = optimisticState === 'booked'

  return (
    <Card.Root size="sm" opacity={isBooked ? 0.7 : 1} transition="opacity 0.2s">
      <Card.Body>
        <HStack justify="space-between">
          <VStack align="start" gap={1}>
            <HStack gap={2}>
              <Icon color="fg.muted" size="sm">
                <LuCalendar />
              </Icon>
              <Text fontSize="sm" fontWeight="medium">
                {dateStr}
              </Text>
            </HStack>
            <HStack gap={2}>
              <Icon color="fg.muted" size="sm">
                <LuClock />
              </Icon>
              <Text fontSize="sm">{timeStr}</Text>
            </HStack>
          </VStack>

          {isBooked ? (
            <Badge colorPalette="green" size="lg">
              <Icon size="sm">
                <LuCheck />
              </Icon>
              Заявка отправлена
            </Badge>
          ) : (
            <Button
              colorPalette="brand"
              size="md"
              onClick={handleBook}
              loading={isPending}
              disabled={disabled}
              aria-label={`Записаться на занятие ${dateStr} в ${timeStr}`}
            >
              Записаться
            </Button>
          )}
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

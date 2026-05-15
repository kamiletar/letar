'use client'

/**
 * QuickBookingWidget — виджет быстрой записи на занятие
 *
 * Показывает топ-3 ближайших свободных слотов у подключённых инструкторов
 * и позволяет записаться в один клик
 *
 * @module quick-booking-widget
 */

import { toaster } from '@/app/_components/ui/toaster'
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Icon,
  Skeleton,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useCallback, useState, useTransition } from 'react'
import { LuCalendarPlus, LuCar, LuCheck, LuClock, LuSparkles, LuUser, LuZap } from 'react-icons/lu'

import { useConfetti } from '@/app/_components/confetti'

interface AvailableSlot {
  id: string
  startTime: Date
  endTime: Date
  instructor: {
    id: string
    name: string | null
    instructorProfile: {
      vehicles: Array<{ brand: string; model: string }> | null
    } | null
  }
}

interface QuickBookingWidgetProps {
  /** Доступные слоты для записи */
  slots: AvailableSlot[]
  /** Функция для бронирования слота */
  onBook: (slotId: string) => Promise<{ success: boolean; error?: string }>
  /** Состояние загрузки */
  isLoading?: boolean
}

/**
 * Форматирование даты слота
 */
function formatSlotDate(date: Date): string {
  const now = new Date()
  const slotDate = new Date(date)

  // Проверяем, сегодня ли
  const isToday =
    slotDate.getDate() === now.getDate() &&
    slotDate.getMonth() === now.getMonth() &&
    slotDate.getFullYear() === now.getFullYear()

  // Проверяем, завтра ли
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow =
    slotDate.getDate() === tomorrow.getDate() &&
    slotDate.getMonth() === tomorrow.getMonth() &&
    slotDate.getFullYear() === tomorrow.getFullYear()

  if (isToday) {
    return 'Сегодня'
  }
  if (isTomorrow) {
    return 'Завтра'
  }

  return slotDate.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Форматирование времени
 */
function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Компонент карточки слота
 */
function SlotCard({ slot, onBook, isBooking }: { slot: AvailableSlot; onBook: () => void; isBooking: boolean }) {
  const vehicle = slot.instructor.instructorProfile?.vehicles?.[0]

  return (
    <Box
      p={3}
      bg="bg"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.subtle"
      _hover={{ borderColor: 'brand.500', shadow: 'sm' }}
      transition="all 0.2s"
    >
      <Flex justify="space-between" align="flex-start" gap={3}>
        <VStack align="flex-start" gap={1} flex={1}>
          {/* Дата и время */}
          <HStack gap={2}>
            <Badge colorPalette="brand" size="sm">
              {formatSlotDate(slot.startTime)}
            </Badge>
            <HStack gap={1} color="fg.muted" fontSize="sm">
              <LuClock size={14} />
              <Text>
                {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
              </Text>
            </HStack>
          </HStack>

          {/* Инструктор */}
          <HStack gap={1} fontSize="sm">
            <LuUser size={14} />
            <Text fontWeight="medium">{slot.instructor.name || 'Инструктор'}</Text>
          </HStack>

          {/* Автомобиль */}
          {vehicle && (
            <HStack gap={1} fontSize="xs" color="fg.muted">
              <LuCar size={12} />
              <Text>
                {vehicle.brand} {vehicle.model}
              </Text>
            </HStack>
          )}
        </VStack>

        {/* Кнопка записи */}
        <Button size="sm" colorPalette="brand" onClick={onBook} disabled={isBooking} minW="90px">
          {isBooking ? (
            <Spinner size="sm" />
          ) : (
            <>
              <LuZap size={14} />
              Записаться
            </>
          )}
        </Button>
      </Flex>
    </Box>
  )
}

/**
 * Скелетон для карточки слота
 */
function SlotCardSkeleton() {
  return (
    <Box p={3} bg="bg" borderRadius="lg" borderWidth="1px">
      <Flex justify="space-between" align="flex-start" gap={3}>
        <VStack align="flex-start" gap={2} flex={1}>
          <Skeleton height="20px" width="150px" />
          <Skeleton height="16px" width="120px" />
          <Skeleton height="14px" width="100px" />
        </VStack>
        <Skeleton height="32px" width="90px" borderRadius="md" />
      </Flex>
    </Box>
  )
}

/**
 * Виджет быстрой записи на занятие
 *
 * @example
 * ```tsx
 * <QuickBookingWidget
 *   slots={availableSlots}
 *   onBook={handleBook}
 *   isLoading={isLoadingSlots}
 * />
 * ```
 */
export function QuickBookingWidget({ slots, onBook, isLoading }: QuickBookingWidgetProps) {
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null)
  const [bookedSlotId, setBookedSlotId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { triggerConfetti, ConfettiComponent } = useConfetti({ count: 30, duration: 2 })

  const handleBook = useCallback(
    async (slotId: string) => {
      setBookingSlotId(slotId)

      startTransition(async () => {
        const result = await onBook(slotId)

        if (result.success) {
          setBookedSlotId(slotId)
          triggerConfetti()
          toaster.success({
            title: 'Записано!',
            description: 'Вы успешно записались на занятие',
          })
        } else {
          toaster.error({
            title: 'Ошибка',
            description: result.error || 'Не удалось записаться',
          })
        }

        setBookingSlotId(null)
      })
    },
    [onBook, triggerConfetti]
  )

  // Фильтруем уже забронированный слот
  const availableSlots = slots.filter((s) => s.id !== bookedSlotId)

  return (
    <>
      <ConfettiComponent />

      <Card.Root
        bg="linear-gradient(135deg, var(--chakra-colors-brand-50) 0%, var(--chakra-colors-bg-subtle) 100%)"
        _dark={{
          bg: 'linear-gradient(135deg, var(--chakra-colors-brand-950) 0%, var(--chakra-colors-gray-800) 100%)',
          borderColor: 'brand.800',
        }}
        borderWidth="1px"
        borderColor="brand.200"
      >
        <Card.Body>
          <VStack gap={4} align="stretch">
            {/* Заголовок */}
            <Flex justify="space-between" align="center">
              <HStack gap={2}>
                <Icon color="brand.500">
                  <LuSparkles size={20} />
                </Icon>
                <Heading size="md">Быстрая запись</Heading>
              </HStack>
              <Button asChild variant="ghost" size="sm">
                <Link href="/my-schedule">
                  <LuCalendarPlus size={16} />
                  Все слоты
                </Link>
              </Button>
            </Flex>

            {/* Состояние загрузки */}
            {isLoading ? (
              <VStack gap={2} align="stretch">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SlotCardSkeleton key={`skeleton-${i}`} />
                ))}
              </VStack>
            ) : availableSlots.length > 0 ? (
              <VStack gap={2} align="stretch">
                {availableSlots.slice(0, 3).map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    onBook={() => handleBook(slot.id)}
                    isBooking={bookingSlotId === slot.id || isPending}
                  />
                ))}
              </VStack>
            ) : bookedSlotId ? (
              <Box p={4} bg="bg" borderRadius="lg" textAlign="center">
                <VStack gap={2}>
                  <Icon color="green.500" boxSize={8}>
                    <LuCheck />
                  </Icon>
                  <Text fontWeight="medium" color="green.600">
                    Отлично! Вы записались на занятие
                  </Text>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/my-lessons">Посмотреть мои занятия</Link>
                  </Button>
                </VStack>
              </Box>
            ) : (
              <Box p={4} bg="bg" borderRadius="lg" textAlign="center">
                <VStack gap={2}>
                  <Text color="fg.muted">Нет доступных слотов в ближайшее время</Text>
                  <Button asChild size="sm" colorPalette="brand">
                    <Link href="/my-schedule">Посмотреть расписание</Link>
                  </Button>
                </VStack>
              </Box>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </>
  )
}

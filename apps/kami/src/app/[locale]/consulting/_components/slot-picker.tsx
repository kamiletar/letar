'use client'

import { Box, Button, HStack, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react'
import { Calendar, Clock } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { memo, useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { getGroupedSlotsAction, type SlotOption } from '../_actions/get-available-slots.action'

interface SlotPickerProps {
  /** Выбранное значение (ISO string) */
  value?: string
  /** Callback при выборе слота */
  onChange?: (slot: SlotOption | null) => void
  /** Количество дней вперёд */
  daysAhead?: number
}

/**
 * Компонент выбора временного слота для консультации
 */
export const SlotPicker = memo(function SlotPicker({ value, onChange, daysAhead = 14 }: SlotPickerProps) {
  const t = useTranslations('consulting')
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [groupedSlots, setGroupedSlots] = useState<Record<string, SlotOption[]>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Загружаем слоты при монтировании или изменении параметров
  useEffect(() => {
    startTransition(async () => {
      const slots = await getGroupedSlotsAction(daysAhead, locale)
      setGroupedSlots(slots)

      // Выбираем первый день по умолчанию
      const dates = Object.keys(slots)
      if (dates.length > 0) {
        setSelectedDate((prev) => prev ?? dates[0])
      }
    })
  }, [daysAhead, locale])

  const handleSlotSelect = useCallback(
    (slot: SlotOption) => {
      onChange?.(slot)
    },
    [onChange]
  )

  const dates = Object.keys(groupedSlots)
  const hasSlots = dates.length > 0

  // Мемоизируем форматированные времена для избежания повторных toLocaleTimeString в render
  const formattedSlots = useMemo(() => {
    const result: Record<string, { start: string; end: string }[]> = {}
    for (const date of Object.keys(groupedSlots)) {
      result[date] = groupedSlots[date].map((slot) => ({
        start: new Date(slot.start).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
        end: new Date(slot.end).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      }))
    }
    return result
  }, [groupedSlots, locale])

  // Мемоизируем форматированное значение выбранного слота
  const formattedSelectedValue = useMemo(() => {
    if (!value) {
      return null
    }
    return new Date(value).toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [value, locale])

  if (isPending && !hasSlots) {
    return (
      <VStack py={8} gap={4}>
        <Spinner size="lg" color="purple.500" />
        <Text color="gray.500">{t('form.loadingSlots') || 'Загрузка слотов...'}</Text>
      </VStack>
    )
  }

  if (!hasSlots) {
    return (
      <VStack py={8} gap={4} p={6} borderRadius="xl" bg={{ base: 'gray.50', _dark: 'gray.800' }}>
        <Calendar size={48} opacity={0.5} />
        <Text color="gray.500" textAlign="center">
          {t('form.noSlots') || 'Нет доступных слотов. Свяжитесь напрямую.'}
        </Text>
      </VStack>
    )
  }

  return (
    <VStack gap={4} align="stretch">
      {/* Выбор даты */}
      <VStack gap={2} align="stretch">
        <Text fontWeight="medium" fontSize="sm" color="gray.600">
          {t('form.selectDate') || 'Выберите дату'}
        </Text>
        <HStack gap={2} overflowX="auto" py={1} flexWrap="wrap">
          {dates.map((date) => (
            <Button
              key={date}
              size="sm"
              variant={selectedDate === date ? 'solid' : 'outline'}
              colorPalette={selectedDate === date ? 'purple' : 'gray'}
              onClick={() => setSelectedDate(date)}
              whiteSpace="nowrap"
            >
              {date}
            </Button>
          ))}
        </HStack>
      </VStack>

      {/* Выбор времени */}
      {selectedDate && groupedSlots[selectedDate] && (
        <VStack gap={2} align="stretch">
          <Text fontWeight="medium" fontSize="sm" color="gray.600">
            {t('form.selectTime') || 'Выберите время'}
          </Text>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={2}>
            {groupedSlots[selectedDate].map((slot, idx) => {
              const isSelected = value === slot.value
              const formatted = formattedSlots[selectedDate]?.[idx]

              return (
                <Button
                  key={slot.value}
                  size="sm"
                  variant={isSelected ? 'solid' : 'outline'}
                  colorPalette={isSelected ? 'purple' : 'gray'}
                  onClick={() => handleSlotSelect(slot)}
                  gap={1}
                >
                  <Clock size={14} />
                  {formatted?.start}–{formatted?.end}
                </Button>
              )
            })}
          </SimpleGrid>
        </VStack>
      )}

      {/* Выбранный слот */}
      {value && formattedSelectedValue && (
        <Box
          p={3}
          borderRadius="lg"
          bg={{ base: 'purple.50', _dark: 'purple.900/20' }}
          borderWidth="1px"
          borderColor={{ base: 'purple.200', _dark: 'purple.700' }}
        >
          <HStack gap={2}>
            <Calendar size={16} />
            <Text fontSize="sm" fontWeight="medium" color={{ base: 'purple.700', _dark: 'purple.300' }}>
              {t('form.selectedSlot') || 'Выбрано'}: {formattedSelectedValue}
            </Text>
          </HStack>
        </Box>
      )}
    </VStack>
  )
})

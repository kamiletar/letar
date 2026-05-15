'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { REMINDER_PERIODS, REMINDER_TYPES, type ReminderType, useReminders } from '@/hooks/use-reminders'
import { Badge, Button, HStack, Icon, Popover, Portal, RadioGroup, Text, Textarea, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { FaBell, FaBellSlash, FaClock } from 'react-icons/fa'

interface ReminderButtonProps {
  productSlug: string
  productName: string
  productImage?: string
}

/**
 * Кнопка "Напомнить позже" для страницы товара.
 * Позволяет установить напоминание о товаре на выбранный срок.
 */
export function ReminderButton({ productSlug, productName, productImage }: ReminderButtonProps) {
  const { addReminder, removeReminder, hasReminder, getProductReminders, isLoading } = useReminders()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDays, setSelectedDays] = useState(7)
  const [selectedType, setSelectedType] = useState<ReminderType>('check_later')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const existingReminders = getProductReminders(productSlug)
  const hasActiveReminder = hasReminder(productSlug)

  const handleSave = async () => {
    setIsSaving(true)
    const result = await addReminder(productSlug, productName, selectedType, selectedDays, note, productImage)
    setIsSaving(false)

    if (result.success) {
      toaster.success({
        title: 'Напоминание установлено',
        description: `Напомним о "${productName}" через ${
          REMINDER_PERIODS.find((p) => p.days === selectedDays)?.label?.toLowerCase() || selectedDays + ' дней'
        }`,
      })
      setIsOpen(false)
      setNote('')
    } else {
      toaster.error({ title: 'Ошибка сохранения напоминания' })
    }
  }

  const handleRemove = async (reminderId: string) => {
    const result = await removeReminder(reminderId)
    if (result.success) {
      toaster.success({ title: 'Напоминание удалено' })
    }
  }

  if (isLoading) {
    return null
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)} positioning={{ placement: 'bottom-start' }}>
      <Popover.Trigger asChild>
        <Button
          variant={hasActiveReminder ? 'solid' : 'outline'}
          colorPalette={hasActiveReminder ? 'green' : 'gray'}
          size="sm"
        >
          <Icon as={hasActiveReminder ? FaBell : FaClock} mr={2} />
          {hasActiveReminder ? 'Напоминание установлено' : 'Напомнить позже'}
          {existingReminders.length > 0 && (
            <Badge ml={2} colorPalette="green" size="sm">
              {existingReminders.length}
            </Badge>
          )}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content maxW="sm">
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <Popover.Header>
              <Popover.Title>
                <Icon as={FaBell} mr={2} />
                Напоминание о товаре
              </Popover.Title>
            </Popover.Header>
            <Popover.Body>
              <VStack align="stretch" gap={4}>
                {/* Активные напоминания */}
                {existingReminders.length > 0 && (
                  <VStack align="stretch" gap={2}>
                    <Text fontSize="sm" fontWeight="medium">
                      Активные напоминания:
                    </Text>
                    {existingReminders.map((r) => (
                      <HStack key={r.id} justify="space-between" p={2} bg="bg.muted" borderRadius="md">
                        <VStack align="start" gap={0}>
                          <Text fontSize="xs" fontWeight="medium">
                            {REMINDER_TYPES[r.type].label}
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            {new Date(r.remindAt).toLocaleDateString('ru-RU')}
                          </Text>
                        </VStack>
                        <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleRemove(r.id)}>
                          <Icon as={FaBellSlash} />
                        </Button>
                      </HStack>
                    ))}
                  </VStack>
                )}

                {/* Тип напоминания */}
                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    Тип напоминания
                  </Text>
                  <RadioGroup.Root value={selectedType} onValueChange={(e) => setSelectedType(e.value as ReminderType)}>
                    <VStack align="stretch" gap={2}>
                      {Object.entries(REMINDER_TYPES).map(([key, { label, description }]) => (
                        <RadioGroup.Item key={key} value={key}>
                          <RadioGroup.ItemHiddenInput />
                          <RadioGroup.ItemControl />
                          <RadioGroup.ItemText>
                            <VStack align="start" gap={0}>
                              <Text fontSize="sm">{label}</Text>
                              <Text fontSize="xs" color="fg.muted">
                                {description}
                              </Text>
                            </VStack>
                          </RadioGroup.ItemText>
                        </RadioGroup.Item>
                      ))}
                    </VStack>
                  </RadioGroup.Root>
                </VStack>

                {/* Срок */}
                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    Когда напомнить?
                  </Text>
                  <HStack gap={2} flexWrap="wrap">
                    {REMINDER_PERIODS.map(({ days, label }) => (
                      <Button
                        key={days}
                        size="xs"
                        variant={selectedDays === days ? 'solid' : 'outline'}
                        colorPalette={selectedDays === days ? 'fg' : 'gray'}
                        onClick={() => setSelectedDays(days)}
                      >
                        {label}
                      </Button>
                    ))}
                  </HStack>
                </VStack>

                {/* Заметка */}
                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    Заметка (опционально)
                  </Text>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Например: дождаться зарплаты"
                    size="sm"
                    rows={2}
                  />
                </VStack>
              </VStack>
            </Popover.Body>
            <Popover.Footer>
              <HStack gap={2} justify="flex-end">
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  Отмена
                </Button>
                <Button colorPalette="fg" size="sm" onClick={handleSave} loading={isSaving}>
                  Установить напоминание
                </Button>
              </HStack>
            </Popover.Footer>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}

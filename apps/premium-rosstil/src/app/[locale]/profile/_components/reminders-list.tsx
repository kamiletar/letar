'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { REMINDER_TYPES, useReminders } from '@/hooks/use-reminders'
import { Link } from '@/i18n/navigation'
import { Badge, Box, Button, Card, HStack, Icon, Skeleton, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import { FaBell, FaCheck, FaClock, FaTrash } from 'react-icons/fa'

/**
 * Список напоминаний о товарах в профиле пользователя.
 */
export function RemindersList() {
  const { reminders, dueReminders, isLoading, markAsNotified, removeReminder, clearDueReminders, hasDueReminders } =
    useReminders()

  if (isLoading) {
    return (
      <Card.Root>
        <Card.Body>
          <VStack gap={4}>
            <Skeleton height="60px" width="100%" />
            <Skeleton height="60px" width="100%" />
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  const handleMarkAsNotified = async (id: string) => {
    const result = await markAsNotified(id)
    if (result.success) {
      toaster.success({ title: 'Отмечено как просмотренное' })
    }
  }

  const handleRemove = async (id: string) => {
    const result = await removeReminder(id)
    if (result.success) {
      toaster.success({ title: 'Напоминание удалено' })
    }
  }

  const handleClearAll = async () => {
    const result = await clearDueReminders()
    if (result.success) {
      toaster.success({ title: 'Все напоминания отмечены' })
    }
  }

  // Форматирование даты
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} дн. назад`
    }
    if (diffDays === 0) {
      return 'Сегодня'
    }
    if (diffDays === 1) {
      return 'Завтра'
    }
    if (diffDays <= 7) {
      return `Через ${diffDays} дн.`
    }
    return date.toLocaleDateString('ru-RU')
  }

  if (reminders.length === 0 && dueReminders.length === 0) {
    return (
      <Card.Root>
        <Card.Header>
          <HStack gap={2}>
            <Icon as={FaBell} color="fg.muted" />
            <Text fontWeight="medium">Напоминания</Text>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack gap={2} py={4}>
            <Icon as={FaClock} boxSize={8} color="fg.muted" />
            <Text color="fg.muted">Нет активных напоминаний</Text>
            <Text fontSize="sm" color="fg.muted" textAlign="center">
              Установите напоминание на странице товара, чтобы вернуться к нему позже
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Icon as={FaBell} color="fg.muted" />
            <Text fontWeight="medium">Напоминания</Text>
            {reminders.length + dueReminders.length > 0 && (
              <Badge colorPalette="fg">{reminders.length + dueReminders.length}</Badge>
            )}
          </HStack>
          {hasDueReminders && (
            <Button size="xs" variant="ghost" onClick={handleClearAll}>
              <Icon as={FaCheck} mr={1} />
              Отметить все
            </Button>
          )}
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {/* Просроченные напоминания (сначала) */}
          {dueReminders.map((reminder) => (
            <Box
              key={reminder.id}
              p={3}
              borderRadius="md"
              borderWidth="1px"
              borderColor="orange.300"
              bg="orange.50"
              _dark={{ bg: 'orange.900/20' }}
            >
              <HStack gap={3}>
                {reminder.productImage && (
                  <Box width="50px" height="50px" position="relative" borderRadius="md" overflow="hidden">
                    <Image src={reminder.productImage} alt={reminder.productName} fill style={{ objectFit: 'cover' }} />
                  </Box>
                )}
                <VStack align="start" flex={1} gap={1}>
                  <HStack gap={2}>
                    <Badge colorPalette="orange" size="sm">
                      Пора проверить!
                    </Badge>
                    <Badge colorPalette="gray" size="sm">
                      {REMINDER_TYPES[reminder.type].label}
                    </Badge>
                  </HStack>
                  <Link href={`/catalog/${reminder.productSlug}`}>
                    <Text fontWeight="medium" fontSize="sm" _hover={{ textDecoration: 'underline' }}>
                      {reminder.productName}
                    </Text>
                  </Link>
                  {reminder.note && (
                    <Text fontSize="xs" color="fg.muted">
                      {reminder.note}
                    </Text>
                  )}
                </VStack>
                <VStack gap={1}>
                  <Button size="xs" colorPalette="green" onClick={() => handleMarkAsNotified(reminder.id)}>
                    <Icon as={FaCheck} />
                  </Button>
                  <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleRemove(reminder.id)}>
                    <Icon as={FaTrash} />
                  </Button>
                </VStack>
              </HStack>
            </Box>
          ))}

          {/* Будущие напоминания */}
          {reminders
            .filter((r) => !dueReminders.some((d) => d.id === r.id))
            .map((reminder) => (
              <Box key={reminder.id} p={3} borderRadius="md" borderWidth="1px">
                <HStack gap={3}>
                  {reminder.productImage && (
                    <Box width="50px" height="50px" position="relative" borderRadius="md" overflow="hidden">
                      <Image
                        src={reminder.productImage}
                        alt={reminder.productName}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </Box>
                  )}
                  <VStack align="start" flex={1} gap={1}>
                    <HStack gap={2}>
                      <Badge colorPalette="gray" size="sm">
                        {REMINDER_TYPES[reminder.type].label}
                      </Badge>
                      <Text fontSize="xs" color="fg.muted">
                        <Icon as={FaClock} mr={1} />
                        {formatDate(reminder.remindAt)}
                      </Text>
                    </HStack>
                    <Link href={`/catalog/${reminder.productSlug}`}>
                      <Text fontWeight="medium" fontSize="sm" _hover={{ textDecoration: 'underline' }}>
                        {reminder.productName}
                      </Text>
                    </Link>
                    {reminder.note && (
                      <Text fontSize="xs" color="fg.muted">
                        {reminder.note}
                      </Text>
                    )}
                  </VStack>
                  <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleRemove(reminder.id)}>
                    <Icon as={FaTrash} />
                  </Button>
                </HStack>
              </Box>
            ))}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

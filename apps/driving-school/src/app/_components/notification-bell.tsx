/**
 * Колокольчик уведомлений
 *
 * Показывает иконку колокольчика с badge счётчиком непрочитанных уведомлений.
 * При клике открывает drawer/popover со списком уведомлений.
 *
 * @module notification-bell
 */

'use client'

import { Badge, Box, Button, Drawer, Heading, HStack, Icon, IconButton, Spinner, Text, VStack } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { LuBell, LuCalendar, LuCheck, LuCheckCheck, LuMessageSquare, LuStar, LuX } from 'react-icons/lu'

import { getNotificationsAction, markAllAsReadAction, markAsReadAction } from './_actions/notification.action'

// === Типы ===

export interface Notification {
  id: string
  type: 'lesson_booked' | 'lesson_confirmed' | 'lesson_cancelled' | 'review_received' | 'message' | 'system'
  title: string
  message: string
  isRead: boolean
  createdAt: Date
  link?: string
}

// === Иконки по типам ===

const notificationIcons: Record<Notification['type'], React.ElementType> = {
  lesson_booked: LuCalendar,
  lesson_confirmed: LuCheck,
  lesson_cancelled: LuX,
  review_received: LuStar,
  message: LuMessageSquare,
  system: LuBell,
}

const notificationColors: Record<Notification['type'], string> = {
  lesson_booked: 'blue',
  lesson_confirmed: 'green',
  lesson_cancelled: 'red',
  review_received: 'yellow',
  message: 'purple',
  system: 'gray',
}

// === Компонент одного уведомления ===

function NotificationItem({ notification, onRead }: { notification: Notification; onRead: (id: string) => void }) {
  const IconComponent = notificationIcons[notification.type]
  const color = notificationColors[notification.type]

  return (
    <Box
      p={3}
      bg={notification.isRead ? 'bg' : 'bg.subtle'}
      borderRadius="md"
      borderWidth="1px"
      borderColor={notification.isRead ? 'border' : `${color}.200`}
      _dark={{
        borderColor: notification.isRead ? 'border' : `${color}.700`,
      }}
      cursor={notification.link ? 'pointer' : 'default'}
      _hover={{
        bg: 'bg.muted',
      }}
      onClick={() => {
        if (!notification.isRead) {
          onRead(notification.id)
        }
        if (notification.link) {
          window.location.href = notification.link
        }
      }}
    >
      <HStack gap={3} align="flex-start">
        <Box
          p={2}
          borderRadius="full"
          bg={`${color}.100`}
          color={`${color}.600`}
          _dark={{
            bg: `${color}.900/30`,
            color: `${color}.300`,
          }}
        >
          <Icon boxSize={4}>
            <IconComponent />
          </Icon>
        </Box>
        <VStack gap={1} align="stretch" flex={1}>
          <HStack justify="space-between">
            <Text fontWeight={notification.isRead ? 'normal' : 'semibold'} fontSize="sm">
              {notification.title}
            </Text>
            {!notification.isRead && <Box w={2} h={2} borderRadius="full" bg={`${color}.500`} flexShrink={0} />}
          </HStack>
          <Text fontSize="xs" color="fg.muted" lineClamp={2}>
            {notification.message}
          </Text>
          <Text fontSize="2xs" color="fg.subtle">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ru })}
          </Text>
        </VStack>
      </HStack>
    </Box>
  )
}

// === Основной компонент ===

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Загрузка уведомлений — пустой dependency array для предотвращения reconnection loop
  const loadNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getNotificationsAction(userId)
      if (result.success) {
        setNotifications(result.notifications)
        setUnreadCount(result.unreadCount)
      }
    } finally {
      setIsLoading(false)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- userId захватывается из замыкания
  }, [])

  // Загружаем при монтировании
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Обновляем при открытии drawer — убрали loadNotifications для предотвращения лишних запросов
  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Отметить как прочитанное
  const handleMarkAsRead = async (id: string) => {
    const result = await markAsReadAction(id)
    if (result.success) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  // Отметить все как прочитанные
  const handleMarkAllAsRead = async () => {
    const result = await markAllAsReadAction(userId)
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    }
  }

  return (
    <>
      {/* Кнопка колокольчика */}
      <Box position="relative">
        <IconButton aria-label="Уведомления" variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
          <LuBell />
        </IconButton>
        {unreadCount > 0 && (
          <Badge
            position="absolute"
            top="-1"
            right="-1"
            colorPalette="red"
            size="xs"
            borderRadius="full"
            minW="18px"
            h="18px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="2xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Box>

      {/* Drawer с уведомлениями */}
      <Drawer.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)} placement="end">
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>
                <HStack gap={2}>
                  <LuBell />
                  <span>Уведомления</span>
                  {unreadCount > 0 && (
                    <Badge colorPalette="red" size="sm">
                      {unreadCount}
                    </Badge>
                  )}
                </HStack>
              </Drawer.Title>
              <Drawer.CloseTrigger asChild>
                <IconButton aria-label="Закрыть" variant="ghost" size="sm" position="absolute" top={3} right={3}>
                  <LuX />
                </IconButton>
              </Drawer.CloseTrigger>
            </Drawer.Header>

            <Drawer.Body>
              {isLoading ? (
                <VStack py={8}>
                  <Spinner size="lg" />
                  <Text color="fg.muted">Загрузка...</Text>
                </VStack>
              ) : notifications.length === 0 ? (
                <VStack py={8} gap={3}>
                  <Icon boxSize={12} color="fg.subtle">
                    <LuBell />
                  </Icon>
                  <Heading size="md" color="fg.muted">
                    Нет уведомлений
                  </Heading>
                  <Text color="fg.subtle" fontSize="sm">
                    Здесь будут появляться уведомления о занятиях и сообщениях
                  </Text>
                </VStack>
              ) : (
                <VStack gap={2} align="stretch">
                  {/* Кнопка "Отметить все как прочитанные" */}
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" alignSelf="flex-end" onClick={handleMarkAllAsRead}>
                      <LuCheckCheck />
                      Прочитать все
                    </Button>
                  )}

                  {notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} onRead={handleMarkAsRead} />
                  ))}
                </VStack>
              )}
            </Drawer.Body>

            <Drawer.Footer>
              <Button asChild variant="outline" size="sm" flex={1}>
                <Link href="/settings/notifications">Настройки уведомлений</Link>
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </>
  )
}

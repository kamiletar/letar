'use client'

import { Badge, Box, IconButton } from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LuMessageCircle } from 'react-icons/lu'

/**
 * Floating кнопка для доступа к чатам с счетчиком непрочитанных сообщений
 *
 * - Fixed позиция в правом нижнем углу
 * - Real-time обновление счетчика через SSE (Server-Sent Events)
 * - Badge с количеством непрочитанных (скрывается при 0)
 */
export function FloatingChatButton() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Подключение к SSE для real-time обновлений
  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectAttempts = 0

    const connectSSE = () => {
      // Закрываем предыдущее подключение если есть
      if (eventSource) {
        eventSource.close()
      }

      // Создаем новое SSE подключение
      eventSource = new EventSource('/api/chats/unread-stream')

      eventSource.addEventListener('unread-count', (event) => {
        try {
          const data = JSON.parse(event.data)
          setUnreadCount(data.count ?? 0)
          setIsLoading(false)
          // ✅ Сбрасываем счётчик попыток при успешном получении данных
          reconnectAttempts = 0
        } catch (error) {
          console.error('[SSE] Failed to parse event:', error)
        }
      })

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error)
        eventSource?.close()

        // ✅ Exponential backoff: 1s → 2s → 4s → 8s → 16s → max 30s
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
        reconnectAttempts++

        console.warn(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)
        setTimeout(connectSSE, delay)
      }
    }

    connectSSE()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  if (isLoading) {
    return null
  }

  return (
    <Box
      position="fixed"
      bottom="2rem"
      right="1rem"
      zIndex={1000}
      display={{ base: 'none', md: 'block' }} // Скрыта на мобильных - там есть кнопка в нижнем меню
    >
      <Link href="/chats" style={{ textDecoration: 'none' }}>
        <Box position="relative">
          <IconButton aria-label="Чаты" size="lg" colorPalette="brand" variant="solid" rounded="full" boxShadow="lg">
            <LuMessageCircle size="1.5rem" />
          </IconButton>

          {/* Badge с количеством непрочитанных */}
          {unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-0.25rem"
              right="-0.25rem"
              colorPalette="red"
              variant="solid"
              rounded="full"
              minW="1.5rem"
              h="1.5rem"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="xs"
              fontWeight="bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Box>
      </Link>
    </Box>
  )
}

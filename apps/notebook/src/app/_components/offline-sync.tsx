'use client'

import { flushOutbox, getOutbox, OUTBOX_EVENT } from '@/lib/offline/outbox-store'
import { Box, Text } from '@chakra-ui/react'
import { useEffect, useState, useSyncExternalStore } from 'react'

function isLocalHost() {
  return ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

/**
 * Регистрирует service worker, отправляет очередь при появлении сети и показывает статус.
 * Service worker не включается на localhost: в dev чанки Turbopack меняются на каждой правке.
 */
export function OfflineSync() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    if (!isLocalHost() && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    let active = true
    const refresh = () => {
      void getOutbox().then((queue) => active && setPending(queue.length))
    }
    window.addEventListener(OUTBOX_EVENT, refresh)
    refresh()
    return () => {
      active = false
      window.removeEventListener(OUTBOX_EVENT, refresh)
    }
  }, [])

  // Сеть вернулась (или страницу только открыли с сетью) — отправляем накопленное
  useEffect(() => {
    if (online) {
      void flushOutbox()
    }
  }, [online])

  if (online && pending === 0) {
    return null
  }
  return (
    <Box
      position="fixed"
      bottom={3}
      insetEnd={3}
      zIndex="banner"
      bg={online ? 'teal.solid' : 'gray.solid'}
      color={online ? 'teal.contrast' : 'gray.contrast'}
      px={3}
      py={2}
      borderRadius="md"
      shadow="md"
      role="status"
    >
      <Text fontSize="sm">
        {online ? `Ждут отправки: ${pending}` : pending > 0 ? `Офлайн · ждут отправки: ${pending}` : 'Офлайн'}
      </Text>
    </Box>
  )
}

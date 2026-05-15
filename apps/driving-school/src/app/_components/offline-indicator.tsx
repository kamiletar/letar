'use client'

import { useOfflineStatus, useSyncQueue } from '@/hooks'
import { Badge, Box, Icon, Portal, Spinner, Text, VStack } from '@chakra-ui/react'
import { LuCloudOff, LuRefreshCw, LuWifiOff } from 'react-icons/lu'

/**
 * Индикатор оффлайн режима и очереди синхронизации
 *
 * Показывает:
 * - Статус оффлайн режима
 * - Количество действий в очереди синхронизации
 * - Индикатор синхронизации
 */
export function OfflineIndicator() {
  const isOffline = useOfflineStatus()
  const { pendingCount, isProcessing } = useSyncQueue()

  // Показываем индикатор если оффлайн или есть действия в очереди
  if (!isOffline && pendingCount === 0 && !isProcessing) {
    return null
  }

  return (
    <Portal>
      <Box position="fixed" bottom={4} left={4} zIndex="toast" role="status" aria-live="polite" aria-atomic="true">
        <VStack gap={2} align="flex-start">
          {/* Индикатор оффлайн */}
          {isOffline && (
            <Badge
              colorPalette="orange"
              size="lg"
              py={2}
              px={3}
              display="flex"
              alignItems="center"
              gap={2}
              boxShadow="lg"
            >
              <Icon>
                <LuWifiOff />
              </Icon>
              Оффлайн
            </Badge>
          )}

          {/* Индикатор очереди синхронизации */}
          {pendingCount > 0 && !isProcessing && (
            <Badge
              colorPalette="blue"
              size="lg"
              py={2}
              px={3}
              display="flex"
              alignItems="center"
              gap={2}
              boxShadow="lg"
            >
              <Icon>
                <LuCloudOff />
              </Icon>
              <Text>
                {pendingCount} {pendingCount === 1 ? 'действие' : pendingCount < 5 ? 'действия' : 'действий'} ожидает
              </Text>
            </Badge>
          )}

          {/* Индикатор синхронизации */}
          {isProcessing && (
            <Badge
              colorPalette="green"
              size="lg"
              py={2}
              px={3}
              display="flex"
              alignItems="center"
              gap={2}
              boxShadow="lg"
            >
              <Spinner size="xs" />
              <Icon>
                <LuRefreshCw />
              </Icon>
              Синхронизация...
            </Badge>
          )}
        </VStack>
      </Box>
    </Portal>
  )
}

'use client'

import { Badge, Box, Icon, Portal, Spinner, Text, VStack } from '@chakra-ui/react'
import { useOfflineStatus, useSyncQueue } from '@letar/forms/offline'
import { LuCloudOff, LuRefreshCw, LuWifiOff } from 'react-icons/lu'

// Хардкодим строки для fallback, когда нет контекста i18n (root layout)
const FALLBACK_OFFLINE_TITLE = 'Нет сети'

/**
 * Глобальный индикатор оффлайн режима и очереди синхронизации
 *
 * Показывает в левом нижнем углу:
 * - Статус оффлайн режима (оранжевый badge)
 * - Количество действий в очереди синхронизации (синий badge)
 * - Индикатор синхронизации (зелёный badge со спиннером)
 *
 * Использует Portal для рендера поверх всего контента.
 * Не зависит от next-intl для работы в root layout.
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
              {FALLBACK_OFFLINE_TITLE}
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

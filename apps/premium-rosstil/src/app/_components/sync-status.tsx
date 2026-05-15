'use client'

import { Box, HStack, Icon, Spinner, Text } from '@chakra-ui/react'
import { useOnlineStatus, usePendingMutations } from '@letar/hooks'
import { MdCloud, MdCloudOff, MdCloudSync } from 'react-icons/md'

/**
 * Компонент индикатора синхронизации
 *
 * Показывает статус:
 * - Оффлайн (оранжевый) — нет подключения
 * - Синхронизация (синий) — есть pending мутации
 * - Скрыт — онлайн и нет pending мутаций
 */
export function SyncStatus() {
  const pendingCount = usePendingMutations()
  const isOnline = useOnlineStatus()

  // Не показываем если онлайн и нет pending мутаций
  if (pendingCount === 0 && isOnline) {
    return null
  }

  return (
    <Box
      position="fixed"
      bottom={4}
      right={4}
      bg={isOnline ? 'blue.500' : 'orange.500'}
      color="white"
      px={4}
      py={2}
      borderRadius="full"
      shadow="lg"
      zIndex={9999}
    >
      <HStack gap={2}>
        {!isOnline ? (
          <>
            <Icon fontSize="md">
              <MdCloudOff />
            </Icon>
            <Text fontSize="sm">Оффлайн</Text>
            {pendingCount > 0 && (
              <Text fontSize="xs" opacity={0.8}>
                ({pendingCount} ожидает)
              </Text>
            )}
          </>
        ) : pendingCount > 0 ? (
          <>
            <Spinner size="sm" />
            <Icon fontSize="md">
              <MdCloudSync />
            </Icon>
            <Text fontSize="sm">Синхронизация ({pendingCount})...</Text>
          </>
        ) : (
          <>
            <Icon fontSize="md">
              <MdCloud />
            </Icon>
            <Text fontSize="sm">Синхронизировано</Text>
          </>
        )}
      </HStack>
    </Box>
  )
}

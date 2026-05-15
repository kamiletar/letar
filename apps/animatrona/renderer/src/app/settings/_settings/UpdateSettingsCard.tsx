'use client'

/**
 * Карточка настроек обновлений
 */

import { Badge, Box, Button, Card, Heading, HStack, Icon, Progress, Spinner, Text, VStack } from '@chakra-ui/react'
import { LuDownload, LuPlay, LuRefreshCw } from 'react-icons/lu'

import type { UpdateStatus } from './types'

interface UpdateSettingsCardProps {
  appVersion: string
  updateStatus: UpdateStatus
  onCheckUpdates: () => Promise<void>
  onDownloadUpdate: () => Promise<void>
  onInstallUpdate: () => Promise<void>
}

/**
 * Настройки обновлений приложения
 */
export function UpdateSettingsCard({
  appVersion,
  updateStatus,
  onCheckUpdates,
  onDownloadUpdate,
  onInstallUpdate,
}: UpdateSettingsCardProps) {
  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <Icon as={LuDownload} color="purple.400" boxSize={5} />
          <Heading size="md">Обновления</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* Текущая версия */}
          <HStack justify="space-between">
            <Text fontWeight="medium">Текущая версия</Text>
            <Badge colorPalette="purple" px={3} py={1} borderRadius="full">
              v{appVersion || '...'}
            </Badge>
          </HStack>

          {/* Статус обновления */}
          {updateStatus.status === 'checking' && (
            <HStack gap={2} p={3} bg="bg.subtle" borderRadius="md">
              <Spinner size="sm" />
              <Text color="fg.muted">Проверка обновлений...</Text>
            </HStack>
          )}

          {updateStatus.status === 'available' && updateStatus.updateInfo && (
            <Box p={3} bg="green.900/20" border="1px" borderColor="green.500/30" borderRadius="md">
              <HStack justify="space-between">
                <VStack align="start" gap={0}>
                  <Text color="green.400" fontWeight="medium">
                    Доступна новая версия!
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    v{updateStatus.updateInfo.version}
                  </Text>
                </VStack>
                <Button colorPalette="green" size="sm" onClick={onDownloadUpdate}>
                  <Icon as={LuDownload} />
                  Скачать
                </Button>
              </HStack>
            </Box>
          )}

          {updateStatus.status === 'downloading' && (
            <Box p={3} bg="bg.subtle" borderRadius="md">
              <VStack gap={2} align="stretch">
                <HStack justify="space-between">
                  <Text color="fg.muted" fontSize="sm">
                    Загрузка обновления...
                  </Text>
                  <Text color="purple.400" fontSize="sm" fontWeight="medium">
                    {updateStatus.downloadProgress.toFixed(0)}%
                  </Text>
                </HStack>
                <Progress.Root value={updateStatus.downloadProgress} colorPalette="purple" size="sm">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
                {updateStatus.downloadSpeed > 0 && (
                  <Text fontSize="xs" color="fg.subtle">
                    {(updateStatus.downloadSpeed / 1024 / 1024).toFixed(1)} МБ/с
                    {updateStatus.downloadEta > 0 && ` • ~${Math.ceil(updateStatus.downloadEta)} сек`}
                  </Text>
                )}
              </VStack>
            </Box>
          )}

          {updateStatus.status === 'downloaded' && (
            <Box p={3} bg="purple.900/20" border="1px" borderColor="purple.500/30" borderRadius="md">
              <HStack justify="space-between">
                <VStack align="start" gap={0}>
                  <Text color="purple.400" fontWeight="medium">
                    Обновление готово к установке
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    Перезапустите приложение для установки
                  </Text>
                </VStack>
                <Button colorPalette="purple" size="sm" onClick={onInstallUpdate}>
                  <Icon as={LuPlay} />
                  Установить
                </Button>
              </HStack>
            </Box>
          )}

          {updateStatus.status === 'not-available' && (
            <Text color="fg.subtle" fontSize="sm">
              У вас установлена последняя версия
            </Text>
          )}

          {updateStatus.status === 'error' && (
            <Box p={3} bg="red.900/20" border="1px" borderColor="red.500/30" borderRadius="md">
              <Text color="red.400" fontSize="sm">
                Ошибка: {updateStatus.error}
              </Text>
            </Box>
          )}

          {/* Кнопка проверки */}
          {(updateStatus.status === 'idle' ||
            updateStatus.status === 'not-available' ||
            updateStatus.status === 'error') && (
            <Button variant="outline" size="sm" onClick={onCheckUpdates} alignSelf="flex-start">
              <Icon as={LuRefreshCw} />
              Проверить обновления
            </Button>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

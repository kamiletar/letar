'use client'

/**
 * Шаг предпросмотра пакетной перекодировки
 */

import { Badge, Box, Button, Dialog, Flex, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import { LuAudioLines, LuCheck, LuPlay } from 'react-icons/lu'

import type { UseBatchReencodeStateReturn } from './use-batch-reencode-state'
import { formatBytes } from './utils'

export function BatchReencodePreviewStep({ state }: { state: UseBatchReencodeStateReturn }) {
  const { preview, isLoadingPreview, error, handleStart, handleClose } = state

  if (isLoadingPreview) {
    return (
      <>
        <Dialog.Body>
          <VStack gap={4} py={8}>
            <Spinner size="lg" />
            <Text color="fg.muted">Анализ аудиодорожек во всех аниме...</Text>
          </VStack>
        </Dialog.Body>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Dialog.Body>
          <Text color="red.400">{error}</Text>
        </Dialog.Body>
        <Dialog.Footer>
          <Button onClick={handleClose}>Закрыть</Button>
        </Dialog.Footer>
      </>
    )
  }

  if (!preview || preview.animes.length === 0) {
    return (
      <>
        <Dialog.Body>
          <VStack gap={4} py={6}>
            <Icon as={LuCheck} boxSize={10} color="green.400" />
            <Text fontWeight="medium">Все аудиодорожки уже оптимизированы</Text>
            <Text color="fg.muted" fontSize="sm">
              Перекодировка не требуется
            </Text>
          </VStack>
        </Dialog.Body>
        <Dialog.Footer>
          <Button onClick={handleClose}>Закрыть</Button>
        </Dialog.Footer>
      </>
    )
  }

  return (
    <>
      <Dialog.Body>
        <VStack gap={4} align="stretch">
          {/* Сводка */}
          <HStack justify="space-between" p={3} bg="bg.subtle" borderRadius="md">
            <VStack align="start" gap={0}>
              <Text fontWeight="medium">
                {preview.animes.length} аниме, {preview.totalTracks} дорожек
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Текущий размер: {formatBytes(preview.totalSize)}
              </Text>
            </VStack>
            <VStack align="end" gap={0}>
              <Text fontWeight="medium" color="green.400">
                ~{formatBytes(preview.totalEstimatedSaving)}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                ожидаемая экономия
              </Text>
            </VStack>
          </HStack>

          {/* Список аниме */}
          <Box maxH="350px" overflowY="auto">
            <VStack gap={1} align="stretch">
              {preview.animes.map((anime) => (
                <Flex key={anime.id} justify="space-between" align="center" p={2} bg="bg.subtle" borderRadius="md">
                  <HStack gap={2}>
                    <Icon as={LuAudioLines} color="purple.400" />
                    <Text fontSize="sm">{anime.name}</Text>
                  </HStack>
                  <HStack gap={2}>
                    <Badge colorPalette="purple">{anime.trackCount} дор.</Badge>
                    <Text fontSize="xs" color="fg.muted">
                      {formatBytes(anime.totalSize)}
                    </Text>
                  </HStack>
                </Flex>
              ))}
            </VStack>
          </Box>
        </VStack>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="outline" onClick={handleClose}>
          Отмена
        </Button>
        <Button colorPalette="purple" onClick={handleStart}>
          <Icon as={LuPlay} mr={2} />
          Начать перекодировку
        </Button>
      </Dialog.Footer>
    </>
  )
}

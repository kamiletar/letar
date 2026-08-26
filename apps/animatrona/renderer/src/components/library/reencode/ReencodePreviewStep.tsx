'use client'

/**
 * Шаг предпросмотра перед перекодировкой
 */

import { Badge, Box, Button, Dialog, Flex, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { LuAudioLines, LuCheck, LuPlay } from 'react-icons/lu'

import { formatBytes } from '@/lib/format-utils'
import type { UseReencodeDialogStateReturn } from './use-reencode-dialog-state'

export function ReencodePreviewStep({ state }: { state: UseReencodeDialogStateReturn }) {
  const { preview, isLoadingPreview, error, targetBitrate, handleStart, handleClose } = state

  if (isLoadingPreview) {
    return (
      <>
        <Dialog.Body>
          <VStack gap={4} py={8}>
            <Spinner size="lg" />
            <Text color="fg.muted">Анализ дорожек...</Text>
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

  if (!preview || preview.tracks.length === 0) {
    return (
      <>
        <Dialog.Body>
          <VStack gap={4} py={6}>
            <LuCheck size={40} color="var(--chakra-colors-green-400)" />
            <Text fontWeight="medium">
              Все дорожки уже соответствуют целевому битрейту ({targetBitrate} kbps) или ниже
            </Text>
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
              <Text fontWeight="medium">{preview.tracks.length} дорожек для перекодировки</Text>
              <Text fontSize="sm" color="fg.muted">
                Целевой битрейт: {targetBitrate} kbps
              </Text>
            </VStack>
            <VStack align="end" gap={0}>
              <Text fontWeight="medium">~{formatBytes(preview.estimatedSaving)}</Text>
              <Text fontSize="sm" color="fg.muted">
                ожидаемая экономия
              </Text>
            </VStack>
          </HStack>

          {/* Список дорожек */}
          <Box maxH="300px" overflowY="auto">
            <VStack gap={1} align="stretch">
              {preview.tracks.map((track) => (
                <Flex key={track.id} justify="space-between" align="center" p={2} bg="bg.subtle" borderRadius="md">
                  <HStack gap={2}>
                    <LuAudioLines color="var(--chakra-colors-purple-400)" />
                    <Text fontSize="sm">
                      Эп.{track.episodeNumber} — {track.title}
                    </Text>
                  </HStack>
                  <HStack gap={2}>
                    {track.bitrate
                      ? <Badge colorPalette="orange">{Math.round(track.bitrate / 1000)} kbps</Badge>
                      : <Badge colorPalette="gray">неизвестно</Badge>}
                    {track.ipfsSize && (
                      <Text fontSize="xs" color="fg.muted">
                        {formatBytes(track.ipfsSize)}
                      </Text>
                    )}
                  </HStack>
                </Flex>
              ))}
            </VStack>
          </Box>

          <Text fontSize="xs" color="fg.muted">
            Текущий размер: {formatBytes(preview.totalSize)}
          </Text>
        </VStack>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="outline" onClick={handleClose}>
          Отмена
        </Button>
        <Button colorPalette="purple" gap={2} onClick={handleStart}>
          <LuPlay />
          Начать перекодировку
        </Button>
      </Dialog.Footer>
    </>
  )
}

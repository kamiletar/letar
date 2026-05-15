'use client'

/**
 * Шаг отображения прогресса перекодировки
 */

import { Badge, Box, Button, Dialog, Flex, HStack, Icon, Progress, Spinner, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuX } from 'react-icons/lu'

import type { UseReencodeDialogStateReturn } from './use-reencode-dialog-state'
import { formatBytes } from './utils'

const STATUS_LABELS: Record<string, string> = {
  downloading: 'Скачивание...',
  transcoding: 'Транскодирование...',
  uploading: 'Загрузка в IPFS...',
}

export function ReencodeProgressStep({ state }: { state: UseReencodeDialogStateReturn }) {
  const { progress } = state

  if (!progress) {
    return (
      <>
        <Dialog.Body>
          <VStack gap={4} py={8} align="center">
            <Spinner size="lg" color="purple.500" />
            <Text color="fg.muted">Подготовка к перекодировке...</Text>
          </VStack>
        </Dialog.Body>
      </>
    )
  }

  // Суммируем прогресс всех активных дорожек для общего процента
  const activeTracks = progress.tracks.filter(
    (t) => t.status === 'downloading' || t.status === 'transcoding' || t.status === 'uploading'
  )
  const activeProgress = activeTracks.reduce((sum, t) => sum + t.percent / 100, 0)
  const overallPercent =
    progress.totalTracks > 0 ? ((progress.completedTracks + activeProgress) / progress.totalTracks) * 100 : 0

  return (
    <>
      <Dialog.Body>
        <VStack gap={4} align="stretch">
          {/* Общий прогресс */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="medium">Перекодировка аудио</Text>
              <Text color="fg.muted">
                {progress.completedTracks} / {progress.totalTracks} дорожек
              </Text>
            </HStack>
            <Progress.Root value={overallPercent}>
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>

          {/* Активные дорожки (параллельная обработка) */}
          {activeTracks.map((track) => (
            <Box key={track.trackId} p={4} bg="bg.subtle" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm">
                  Эп.{track.episodeNumber} — {track.trackTitle}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  {STATUS_LABELS[track.status] ?? track.status} {Math.round(track.percent)}%
                </Text>
              </HStack>
              <Progress.Root value={track.percent} colorPalette="purple">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </Box>
          ))}

          {/* Список дорожек */}
          <Box maxH="200px" overflowY="auto">
            <VStack gap={1} align="stretch">
              {progress.tracks.map((track) => (
                <Flex
                  key={track.trackId}
                  justify="space-between"
                  align="center"
                  p={2}
                  bg={
                    track.status === 'transcoding' || track.status === 'downloading' || track.status === 'uploading'
                      ? 'purple.subtle'
                      : 'bg.subtle'
                  }
                  color={
                    track.status === 'transcoding' || track.status === 'downloading' || track.status === 'uploading'
                      ? 'purple.fg'
                      : undefined
                  }
                  borderRadius="md"
                >
                  <Text fontSize="sm">
                    Эп.{track.episodeNumber} {track.trackTitle}
                  </Text>
                  <HStack gap={2}>
                    {track.status === 'pending' && <Badge colorPalette="gray">Ожидание</Badge>}
                    {(track.status === 'downloading' ||
                      track.status === 'transcoding' ||
                      track.status === 'uploading') && (
                      <Badge colorPalette="purple">{Math.round(track.percent)}%</Badge>
                    )}
                    {track.status === 'done' && (
                      <HStack gap={1}>
                        <Badge colorPalette="green">
                          <Icon as={LuCheck} />
                        </Badge>
                        {track.savedBytes != null && track.savedBytes > 0 && (
                          <Text fontSize="xs" color="green.400">
                            -{formatBytes(track.savedBytes)}
                          </Text>
                        )}
                      </HStack>
                    )}
                    {track.status === 'error' && (
                      <Badge colorPalette="red">
                        <Icon as={LuX} />
                      </Badge>
                    )}
                  </HStack>
                </Flex>
              ))}
            </VStack>
          </Box>

          {/* Сэкономлено */}
          {progress.savedBytes > 0 && (
            <Text fontSize="sm" color="green.400" fontWeight="medium">
              Сэкономлено: {formatBytes(progress.savedBytes)}
            </Text>
          )}
        </VStack>
      </Dialog.Body>

      <Dialog.Footer>
        <Button colorPalette="red" variant="outline" disabled={!state.isReencoding} onClick={state.handleCancel}>
          <Icon as={LuX} mr={2} />
          Отменить
        </Button>
      </Dialog.Footer>
    </>
  )
}

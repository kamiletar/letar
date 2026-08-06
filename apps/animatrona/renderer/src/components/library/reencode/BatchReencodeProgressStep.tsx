'use client'

/**
 * Шаг прогресса пакетной перекодировки
 */

import { Badge, Box, Button, Dialog, Flex, HStack, Icon, Progress, Spinner, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuX } from 'react-icons/lu'

import { formatBytes } from '@/lib/format-utils'
import type { UseBatchReencodeStateReturn } from './use-batch-reencode-state'

const STATUS_LABELS: Record<string, string> = {
  downloading: 'Скачивание...',
  transcoding: 'Транскодирование...',
  uploading: 'Загрузка в IPFS...',
}

export function BatchReencodeProgressStep({ state }: { state: UseBatchReencodeStateReturn }) {
  const { progress } = state

  if (!progress) {
    return (
      <>
        <Dialog.Body>
          <VStack gap={4} py={8} align="center">
            <Spinner size="lg" color="purple.500" />
            <Text color="fg.muted">Подготовка к пакетной перекодировке...</Text>
          </VStack>
        </Dialog.Body>
      </>
    )
  }

  // Общий процент: по аниме + процент текущего аниме
  const trackProgress = progress.trackProgress
  let currentAnimePercent = 0
  if (trackProgress && trackProgress.totalTracks > 0) {
    const activeTracks = trackProgress.tracks.filter(
      (t) => t.status === 'downloading' || t.status === 'transcoding' || t.status === 'uploading',
    )
    const activeProgress = activeTracks.reduce((sum, t) => sum + t.percent / 100, 0)
    currentAnimePercent = ((trackProgress.completedTracks + activeProgress) / trackProgress.totalTracks) * 100
  }

  const overallPercent = progress.totalAnimes > 0
    ? ((progress.completedAnimes + currentAnimePercent / 100) / progress.totalAnimes) * 100
    : 0

  // Активные дорожки текущего аниме
  const activeTracks = trackProgress?.tracks.filter(
    (t) => t.status === 'downloading' || t.status === 'transcoding' || t.status === 'uploading',
  ) ?? []

  return (
    <>
      <Dialog.Body>
        <VStack gap={4} align="stretch">
          {/* Общий прогресс по аниме */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="medium">Пакетная перекодировка</Text>
              <Text color="fg.muted">
                {progress.completedAnimes} / {progress.totalAnimes} аниме
              </Text>
            </HStack>
            <Progress.Root value={overallPercent}>
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>

          {/* Текущее аниме */}
          <Box p={3} bg="purple.subtle" borderRadius="md">
            <HStack justify="space-between" mb={1}>
              <Text fontSize="sm" fontWeight="medium" color="purple.fg">
                {progress.currentAnimeName}
              </Text>
              {trackProgress && (
                <Text fontSize="sm" color="purple.fg">
                  {trackProgress.completedTracks} / {trackProgress.totalTracks} дорожек
                </Text>
              )}
            </HStack>
            <Progress.Root value={currentAnimePercent} colorPalette="purple" size="sm">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>

          {/* Активные дорожки текущего аниме */}
          {activeTracks.map((track) => (
            <Box key={track.trackId} p={3} bg="bg.subtle" borderRadius="md">
              <HStack justify="space-between" mb={1}>
                <Text fontSize="sm">
                  Эп.{track.episodeNumber} — {track.trackTitle}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  {STATUS_LABELS[track.status] ?? track.status} {Math.round(track.percent)}%
                </Text>
              </HStack>
              <Progress.Root value={track.percent} colorPalette="purple" size="xs">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </Box>
          ))}

          {/* Завершённые дорожки текущего аниме */}
          {trackProgress && trackProgress.tracks.length > 0 && (
            <Box maxH="150px" overflowY="auto">
              <VStack gap={1} align="stretch">
                {trackProgress.tracks.map((track) => (
                  <Flex
                    key={track.trackId}
                    justify="space-between"
                    align="center"
                    p={2}
                    bg="bg.subtle"
                    borderRadius="md"
                  >
                    <Text fontSize="sm">
                      Эп.{track.episodeNumber} {track.trackTitle}
                    </Text>
                    <HStack gap={2}>
                      {track.status === 'pending' && <Badge colorPalette="gray">Ожидание</Badge>}
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
          )}

          {/* Сэкономлено */}
          {progress.totalSavedBytes > 0 && (
            <Text fontSize="sm" color="green.400" fontWeight="medium">
              Сэкономлено: {formatBytes(progress.totalSavedBytes)}
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

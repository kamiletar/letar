'use client'

/**
 * Шаг отображения прогресса экспорта
 */

import { Badge, Box, Button, Dialog, Flex, HStack, Progress, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuX } from 'react-icons/lu'

import type { useExportDialogState } from './use-export-dialog-state'

/**
 * Props для ExportProgressStep
 */
export interface ExportProgressStepProps {
  state: ReturnType<typeof useExportDialogState>
}

/**
 * Компонент шага прогресса экспорта
 */
export function ExportProgressStep({ state }: ExportProgressStepProps) {
  const currentEp = state.progress?.episodes[state.progress.currentEpisodeIndex]
  const overallPercent = state.progress
    ? ((state.progress.completedEpisodes + (currentEp?.percent || 0) / 100) / state.progress.totalEpisodes) * 100
    : 0

  return (
    <>
      <Dialog.Body>
        <VStack gap={4} align="stretch">
          {/* Общий прогресс */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="medium">Экспорт сериала</Text>
              <Text color="fg.muted">
                {state.progress?.completedEpisodes || 0} / {state.progress?.totalEpisodes || 0} эпизодов
              </Text>
            </HStack>
            <Progress.Root value={overallPercent}>
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>

          {/* Текущий эпизод */}
          {currentEp && (
            <Box p={4} bg="bg.subtle" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text>
                  Эпизод {currentEp.episodeNumber} (Сезон {currentEp.seasonNumber})
                </Text>
                <Text color="fg.muted">{Math.round(currentEp.percent)}%</Text>
              </HStack>
              <Progress.Root value={currentEp.percent} colorPalette="purple">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </Box>
          )}

          {/* Список эпизодов */}
          <Box maxH="200px" overflowY="auto">
            <VStack gap={1} align="stretch">
              {state.progress?.episodes.map((ep) => (
                <Flex
                  key={ep.episodeId}
                  justify="space-between"
                  align="center"
                  p={2}
                  bg={ep.status === 'processing' ? 'purple.900' : 'bg.subtle'}
                  borderRadius="md"
                >
                  <Text fontSize="sm">
                    S{String(ep.seasonNumber).padStart(2, '0')}E{String(ep.episodeNumber).padStart(2, '0')}
                  </Text>
                  <HStack gap={2}>
                    {ep.status === 'pending' && <Badge colorPalette="gray">Ожидание</Badge>}
                    {ep.status === 'processing' && <Badge colorPalette="purple">{Math.round(ep.percent)}%</Badge>}
                    {ep.status === 'completed' && (
                      <Badge colorPalette="green">
                        <LuCheck />
                      </Badge>
                    )}
                    {ep.status === 'error' && (
                      <Badge colorPalette="red">
                        <LuX />
                      </Badge>
                    )}
                    {ep.status === 'skipped' && <Badge colorPalette="yellow">Пропущен</Badge>}
                  </HStack>
                </Flex>
              ))}
            </VStack>
          </Box>
        </VStack>
      </Dialog.Body>

      <Dialog.Footer>
        <Button
          colorPalette="red"
          variant="outline"
          gap={2}
          onClick={state.handleCancel}
          disabled={!state.isExporting}
        >
          <LuX />
          Отменить
        </Button>
      </Dialog.Footer>
    </>
  )
}

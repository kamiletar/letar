'use client'

/**
 * Шаг 2: Сопоставление файлов донора с эпизодами библиотеки
 */

import { Badge, Box, HStack, Icon, NativeSelect, Table, Text, VStack } from '@chakra-ui/react'
import { LuArrowRight, LuCheck, LuTriangleAlert } from 'react-icons/lu'

import type { EpisodeMatch, LibraryEpisode } from '@/lib/add-tracks'

interface FileMatchingStepProps {
  /** Сопоставления */
  matches: EpisodeMatch[]
  /** Эпизоды библиотеки для выбора */
  libraryEpisodes: LibraryEpisode[]
  /** Обработчик изменения сопоставления */
  onMatchChange: (donorFilePath: string, targetEpisode: { id: string; number: number } | null) => void
}

/**
 * Бейдж статуса сопоставления
 */
function MatchStatusBadge({ confidence }: { confidence: EpisodeMatch['confidence'] }) {
  switch (confidence) {
    case 'auto':
      return (
        <Badge colorPalette="green" variant="subtle" size="sm">
          <Icon as={LuCheck} boxSize={3} mr={1} />
          Авто
        </Badge>
      )
    case 'manual':
      return (
        <Badge colorPalette="blue" variant="subtle" size="sm">
          <Icon as={LuCheck} boxSize={3} mr={1} />
          Вручную
        </Badge>
      )
    case 'unmatched':
      return (
        <Badge colorPalette="orange" variant="subtle" size="sm">
          <Icon as={LuTriangleAlert} boxSize={3} mr={1} />
          Не сопоставлено
        </Badge>
      )
  }
}

/**
 * Шаг сопоставления файлов с эпизодами
 */
export function FileMatchingStep({ matches, libraryEpisodes, onMatchChange }: FileMatchingStepProps) {
  // Считаем статистику
  const matchedCount = matches.filter((m) => m.targetEpisode !== null).length
  const unmatchedCount = matches.length - matchedCount

  return (
    <VStack gap={4} align="stretch" py={4}>
      {/* Статистика */}
      <HStack justify="space-between" px={2}>
        <Text fontSize="sm" color="fg.muted">
          Сопоставлено: <strong>{matchedCount}</strong> из {matches.length}
        </Text>
        {unmatchedCount > 0 && (
          <Text fontSize="sm" color="status.warning">
            {unmatchedCount} файлов не сопоставлено
          </Text>
        )}
      </HStack>

      {/* Таблица сопоставлений */}
      <Box bg="bg.muted" borderRadius="lg" borderWidth="1px" borderColor="border" overflow="hidden">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row bg="bg.emphasized">
              <Table.ColumnHeader color="fg.muted" width="50%">
                Файл донора
              </Table.ColumnHeader>
              <Table.ColumnHeader color="fg.muted" width="80px" textAlign="center">
                →
              </Table.ColumnHeader>
              <Table.ColumnHeader color="fg.muted" width="50%">
                Эпизод библиотеки
              </Table.ColumnHeader>
              <Table.ColumnHeader color="fg.muted" width="100px">
                Статус
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {matches.map((match) => (
              <Table.Row
                key={match.donorFile.path}
                bg={match.confidence === 'unmatched' ? 'warning.subtle' : undefined}
              >
                {/* Файл донора */}
                <Table.Cell>
                  <VStack align="start" gap={0}>
                    <Text fontSize="sm" color="fg" wordBreak="break-all">
                      {match.donorFile.name}
                    </Text>
                    {match.donorFile.episodeNumber !== null && (
                      <Text fontSize="xs" color="fg.subtle">
                        Распознан как: EP {match.donorFile.episodeNumber}
                      </Text>
                    )}
                  </VStack>
                </Table.Cell>

                {/* Стрелка */}
                <Table.Cell textAlign="center">
                  <Icon as={LuArrowRight} color="fg.subtle" />
                </Table.Cell>

                {/* Эпизод библиотеки */}
                <Table.Cell>
                  <NativeSelect.Root size="sm">
                    <NativeSelect.Field
                      value={match.targetEpisode?.id || ''}
                      onChange={(e) => {
                        const episodeId = e.target.value
                        if (!episodeId) {
                          onMatchChange(match.donorFile.path, null)
                        } else {
                          const episode = libraryEpisodes.find((ep) => ep.id === episodeId)
                          if (episode) {
                            onMatchChange(match.donorFile.path, { id: episode.id, number: episode.number })
                          }
                        }
                      }}
                    >
                      <option value="">— Не выбрано —</option>
                      {libraryEpisodes.map((ep) => (
                        <option key={ep.id} value={ep.id}>
                          Эпизод {ep.number}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Table.Cell>

                {/* Статус */}
                <Table.Cell>
                  <MatchStatusBadge confidence={match.confidence} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      {/* Подсказка */}
      <Text fontSize="sm" color="fg.subtle" textAlign="center">
        Проверьте сопоставление файлов и исправьте при необходимости.
        <br />
        Несопоставленные файлы будут пропущены.
      </Text>
    </VStack>
  )
}

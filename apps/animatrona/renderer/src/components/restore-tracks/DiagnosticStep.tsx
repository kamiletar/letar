'use client'

/**
 * Шаг 1: Диагностика — показывает состояние аудиодорожек аниме
 * Выявляет эпизоды без аудио и битые записи (без transcodedCid)
 */

import { Badge, Box, Button, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuCaptions, LuMusic, LuTrash2, LuTriangleAlert } from 'react-icons/lu'

import type { AudioTrack, ImportError, SubtitleTrack } from '@/generated/prisma'

interface EpisodeDiagnostic {
  id: string
  number: number
  audioTracks: AudioTrack[]
  subtitleTracks: SubtitleTrack[]
}

interface DiagnosticStepProps {
  /** Эпизоды с аудиодорожками */
  episodes: EpisodeDiagnostic[]
  /** Ошибки импорта (неразрешённые) */
  importErrors: ImportError[]
  /** Callback очистки битых записей */
  onCleanAndContinue: () => Promise<void>
}

/**
 * Шаг диагностики для восстановления дорожек
 */
export function DiagnosticStep({ episodes, importErrors, onCleanAndContinue }: DiagnosticStepProps) {
  const [isCleaning, setIsCleaning] = useState(false)

  // Подсчёт проблем
  const episodesWithoutAudio = episodes.filter((ep) => ep.audioTracks.length === 0)
  const episodesWithoutSubs = episodes.filter((ep) => ep.subtitleTracks.length === 0)
  const brokenAudioTracks = episodes.flatMap((ep) => ep.audioTracks.filter((t) => !t.transcodedCid))
  const brokenSubTracks = episodes.flatMap((ep) => ep.subtitleTracks.filter((t) => !t.fileCid))
  const brokenTracks = [...brokenAudioTracks, ...brokenSubTracks]
  const totalProblems = episodesWithoutAudio.length + episodesWithoutSubs.length + brokenTracks.length

  const handleClean = async () => {
    setIsCleaning(true)
    try {
      await onCleanAndContinue()
    } finally {
      setIsCleaning(false)
    }
  }

  return (
    <VStack gap={6} align="stretch" py={4}>
      {/* Заголовок */}
      <Box textAlign="center">
        <VStack gap={2}>
          <LuTriangleAlert size={48} color="var(--chakra-colors-warning-fg)" />
          <Text fontSize="lg" fontWeight="medium">
            Диагностика дорожек
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Обнаружены проблемы у {totalProblems} эпизодов
          </Text>
        </VStack>
      </Box>

      {/* Статистика */}
      <Box p={4} bg="bg.muted" borderRadius="lg" borderWidth="1px" borderColor="border">
        <VStack gap={3} align="stretch">
          {/* Эпизоды без аудио */}
          {episodesWithoutAudio.length > 0 && (
            <HStack gap={3}>
              <LuMusic color="var(--chakra-colors-error-fg)" size={20} />
              <Text fontSize="sm" flex={1}>
                Эпизодов без аудиодорожек
              </Text>
              <Badge colorPalette="red" size="lg">
                {episodesWithoutAudio.length}
              </Badge>
            </HStack>
          )}

          {/* Эпизоды без субтитров */}
          {episodesWithoutSubs.length > 0 && (
            <HStack gap={3}>
              <LuCaptions color="var(--chakra-colors-warning-fg)" size={20} />
              <Text fontSize="sm" flex={1}>
                Эпизодов без субтитров
              </Text>
              <Badge colorPalette="orange" size="lg">
                {episodesWithoutSubs.length}
              </Badge>
            </HStack>
          )}

          {/* Битые записи */}
          {brokenTracks.length > 0 && (
            <HStack gap={3}>
              <LuTrash2 color="var(--chakra-colors-warning-fg)" size={20} />
              <Text fontSize="sm" flex={1}>
                Битых записей (без CID)
              </Text>
              <Badge colorPalette="orange" size="lg">
                {brokenTracks.length}
              </Badge>
            </HStack>
          )}

          {/* Ошибки импорта */}
          {importErrors.length > 0 && (
            <HStack gap={3}>
              <LuTriangleAlert color="var(--chakra-colors-warning-fg)" size={20} />
              <Text fontSize="sm" flex={1}>
                Ошибок импорта
              </Text>
              <Badge colorPalette="orange" size="lg">
                {importErrors.length}
              </Badge>
            </HStack>
          )}
        </VStack>
      </Box>

      {/* Список проблемных эпизодов */}
      {episodesWithoutAudio.length > 0 && (
        <Box p={3} bg="bg.emphasized" borderRadius="md" maxH="200px" overflowY="auto">
          <Text fontSize="xs" color="fg.subtle" mb={2} fontWeight="medium">
            Эпизоды без аудио:
          </Text>
          <HStack gap={2} flexWrap="wrap">
            {episodesWithoutAudio.map((ep) => (
              <Badge key={ep.id} variant="subtle" colorPalette="red" size="sm">
                EP {ep.number}
              </Badge>
            ))}
          </HStack>
        </Box>
      )}

      {/* Кнопка */}
      <Box textAlign="center">
        <Button colorPalette="purple" size="lg" onClick={handleClean} disabled={isCleaning}>
          {isCleaning
            ? (
              <>
                <Spinner size="sm" mr={2} />
                Очистка...
              </>
            )
            : brokenTracks.length > 0
            ? (
              'Очистить битые записи и продолжить'
            )
            : (
              'Продолжить к выбору папки'
            )}
        </Button>
      </Box>

      {/* Подсказка */}
      <Text textAlign="center" fontSize="sm" color="fg.subtle">
        {brokenTracks.length > 0
          ? 'Битые записи будут удалены. Затем выберите папку с исходными MKV файлами для восстановления дорожек.'
          : 'Выберите папку с исходными MKV файлами для восстановления аудио и субтитров.'}
      </Text>
    </VStack>
  )
}

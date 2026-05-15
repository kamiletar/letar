'use client'

/**
 * Шаг 5: Калибровка синхронизации донора
 *
 * Позволяет визуально откалибровать смещение между оригиналом и донором
 * с помощью DualVideoPlayer (overlay режим).
 */

import { Box, Button, createListCollection, HStack, Icon, Select, Text, VStack } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { LuInfo, LuPlay, LuRotateCcw } from 'react-icons/lu'

import { DualVideoPlayer } from '../player/DualVideoPlayer'
import { OffsetInput } from './OffsetInput'

import type { ParsedFile } from './FileScanStep'

interface SyncCalibrationStepProps {
  /** Файлы оригинала */
  originalFiles: ParsedFile[]
  /** Файлы донора */
  donorFiles: ParsedFile[]
  /** Текущее смещение в мс */
  syncOffset: number
  /** Callback при изменении смещения */
  onSyncOffsetChange: (offset: number) => void
}

/**
 * Получить URL для локального видеофайла
 * Использует кастомный media:// протокол Electron
 */
function getVideoUrl(filePath: string): string {
  // Кастомный media:// протокол для безопасного доступа к локальным файлам
  return `media://${filePath.replace(/\\/g, '/')}`
}

/**
 * Шаг калибровки синхронизации
 */
export function SyncCalibrationStep({
  originalFiles,
  donorFiles,
  syncOffset,
  onSyncOffsetChange,
}: SyncCalibrationStepProps) {
  // Выбранный эпизод для калибровки
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(0)
  // Показывать плеер
  const [showPlayer, setShowPlayer] = useState(false)

  /**
   * Найти пары оригинал-донор по номеру эпизода
   */
  const matchedPairs = useMemo(() => {
    const pairs: Array<{
      original: ParsedFile
      donor: ParsedFile
      episodeNumber: number
    }> = []

    const selectedOriginals = originalFiles.filter((f) => f.selected && f.episodeNumber !== null)

    for (const original of selectedOriginals) {
      const donor = donorFiles.find((d) => d.episodeNumber === original.episodeNumber)
      if (donor && original.episodeNumber !== null) {
        pairs.push({
          original,
          donor,
          episodeNumber: original.episodeNumber,
        })
      }
    }

    return pairs.sort((a, b) => a.episodeNumber - b.episodeNumber)
  }, [originalFiles, donorFiles])

  /** Коллекция для Select */
  const episodeCollection = useMemo(() => {
    return createListCollection({
      items: matchedPairs.map((pair, index) => ({
        label: `Эпизод ${pair.episodeNumber}`,
        value: index.toString(),
      })),
    })
  }, [matchedPairs])

  /** Текущая пара */
  const currentPair = matchedPairs[selectedEpisodeIndex]

  /** Обработка изменения эпизода */
  const handleEpisodeChange = useCallback((value: string) => {
    const index = parseInt(value, 10)
    if (!isNaN(index)) {
      setSelectedEpisodeIndex(index)
    }
  }, [])

  /** Сброс смещения */
  const handleReset = useCallback(() => {
    onSyncOffsetChange(0)
  }, [onSyncOffsetChange])

  if (matchedPairs.length === 0) {
    return (
      <VStack gap={6} align="stretch" py={4}>
        <Box p={6} bg="bg.subtle" borderRadius="lg" textAlign="center">
          <Icon as={LuInfo} boxSize={10} color="fg.subtle" mb={3} />
          <Text color="fg.muted">Не найдено совпадающих эпизодов между оригиналом и донором.</Text>
          <Text fontSize="sm" color="fg.subtle" mt={2}>
            Убедитесь, что папка донора содержит файлы с теми же номерами эпизодов.
          </Text>
        </Box>
      </VStack>
    )
  }

  return (
    <VStack gap={4} align="stretch" py={4}>
      {/* Инструкция */}
      <Box p={4} bg="purple.900/20" borderRadius="lg" borderWidth="1px" borderColor="purple.800/50">
        <VStack gap={2} align="start">
          <Text fontWeight="medium" color="purple.400">
            📐 Калибровка синхронизации
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Сравните оригинал и донор визуально. Если они не совпадают, используйте стрелки ←/→ для подстройки смещения
            (±10мс), Shift+←/→ (±100мс), Ctrl+←/→ (±1000мс).
          </Text>
        </VStack>
      </Box>

      {/* Выбор эпизода и управление */}
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <HStack gap={3}>
          <Text fontSize="sm" color="fg.muted">
            Эпизод для калибровки:
          </Text>
          <Select.Root
            collection={episodeCollection}
            value={[selectedEpisodeIndex.toString()]}
            onValueChange={(details) => handleEpisodeChange(details.value[0])}
            size="sm"
            width="150px"
          >
            <Select.Trigger>
              <Select.ValueText placeholder="Выберите эпизод" />
            </Select.Trigger>
            <Select.Positioner>
              <Select.Content>
                {episodeCollection.items.map((item) => (
                  <Select.Item key={item.value} item={item}>
                    <Select.ItemText>{item.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </HStack>

        <HStack gap={2}>
          <Button size="sm" variant="outline" onClick={handleReset} disabled={syncOffset === 0}>
            <Icon as={LuRotateCcw} mr={1} />
            Сбросить
          </Button>
          <Button size="sm" colorPalette="purple" onClick={() => setShowPlayer(!showPlayer)}>
            <Icon as={LuPlay} mr={1} />
            {showPlayer ? 'Скрыть плеер' : 'Открыть плеер'}
          </Button>
        </HStack>
      </HStack>

      {/* Поле ввода смещения */}
      <Box p={4} bg="bg.subtle" borderRadius="lg" borderWidth="1px" borderColor="border.subtle">
        <OffsetInput
          value={syncOffset}
          onChange={onSyncOffsetChange}
          label="Смещение донора"
          hint={
            syncOffset === 0
              ? 'Синхронизация не требуется'
              : syncOffset > 0
                ? `Донор опережает на ${syncOffset}мс → обрезаем начало дорожек`
                : `Донор отстаёт на ${Math.abs(syncOffset)}мс → добавляем тишину в начало`
          }
          showButtons
        />
      </Box>

      {/* Плеер */}
      {showPlayer && currentPair && (
        <Box borderWidth="1px" borderColor="border.subtle" borderRadius="lg" overflow="hidden">
          <DualVideoPlayer
            originalPath={getVideoUrl(currentPair.original.path)}
            donorPath={getVideoUrl(currentPair.donor.path)}
            offsetMs={syncOffset}
            onOffsetChange={onSyncOffsetChange}
            originalLabel={`Оригинал: Эп. ${currentPair.episodeNumber}`}
            donorLabel={`Донор: Эп. ${currentPair.episodeNumber}`}
          />
        </Box>
      )}

      {/* Информация о файлах */}
      {currentPair && (
        <Box p={3} bg="bg.subtle" borderRadius="md">
          <VStack gap={2} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="xs" color="fg.subtle">
                Оригинал:
              </Text>
              <Text fontSize="xs" color="fg.muted" truncate maxW="400px">
                {currentPair.original.name}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="fg.subtle">
                Донор:
              </Text>
              <Text fontSize="xs" color="purple.400" truncate maxW="400px">
                {currentPair.donor.name}
              </Text>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* Статистика */}
      <Box p={3} bg="bg.subtle" borderRadius="md">
        <HStack justify="center" gap={6}>
          <VStack gap={0}>
            <Text fontSize="2xl" fontWeight="bold" color="green.400">
              {matchedPairs.length}
            </Text>
            <Text fontSize="xs" color="fg.subtle">
              эпизодов с донором
            </Text>
          </VStack>
          <VStack gap={0}>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              fontFamily="mono"
              color={syncOffset === 0 ? 'fg.muted' : syncOffset > 0 ? 'green.400' : 'orange.400'}
            >
              {syncOffset >= 0 ? '+' : ''}
              {syncOffset}
            </Text>
            <Text fontSize="xs" color="fg.subtle">
              мс смещение
            </Text>
          </VStack>
        </HStack>
      </Box>

      {/* Горячие клавиши */}
      {showPlayer && (
        <Box p={3} bg="bg.panel" borderRadius="md">
          <Text fontSize="xs" color="fg.subtle" textAlign="center">
            <strong>Горячие клавиши:</strong> Space — play/pause • ←/→ — ±10мс • Shift+←/→ — ±100мс • Ctrl+←/→ — ±1000мс
            • Home — сброс • D — скрыть донор • M — звук • F — полноэкранный
          </Text>
        </Box>
      )}
    </VStack>
  )
}

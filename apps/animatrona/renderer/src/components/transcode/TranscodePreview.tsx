'use client'

import { Badge, Box, Button, Card, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { LuCircleCheck, LuCopy, LuFileVideo, LuPlay, LuRotateCcw, LuSkipForward, LuX } from 'react-icons/lu'

import { formatBytes } from '@/lib/format-utils'
import type { QueueItem, TrackRecommendation } from '../../../../shared/types'

interface TranscodePreviewProps {
  /** Очередь элементов для предпросмотра */
  items: QueueItem[]
  /** Обработчик запуска */
  onStart: () => void
  /** Обработчик отмены */
  onCancel: () => void
  /** Обработчик изменения настроек элемента */
  onEditSettings?: (id: string) => void
  /** Обработчик удаления элемента */
  onRemove?: (id: string) => void
  /** Загрузка */
  isLoading?: boolean
}

interface RecommendationBadgeProps {
  recommendation: TrackRecommendation
}

/**
 * Бейдж рекомендации для дорожки
 */
function RecommendationBadge({ recommendation }: RecommendationBadgeProps) {
  let colorPalette: string
  let icon: React.ElementType
  let text: string

  switch (recommendation.action) {
    case 'transcode':
      colorPalette = 'purple'
      icon = LuRotateCcw
      text = 'Перекодировать'
      break
    case 'copy':
      colorPalette = 'blue'
      icon = LuCopy
      text = 'Копировать'
      break
    case 'skip':
      colorPalette = 'gray'
      icon = LuSkipForward
      text = 'Пропустить'
      break
  }

  return (
    <Badge colorPalette={colorPalette} size="sm">
      <HStack gap={1}>
        <Icon as={icon} boxSize={3} />
        <Text>{text}</Text>
      </HStack>
    </Badge>
  )
}

interface PreviewItemProps {
  item: QueueItem
  onEdit?: () => void
  onRemove?: () => void
}

/**
 * Элемент предпросмотра
 */
function PreviewItem({ item, onEdit, onRemove }: PreviewItemProps) {
  const { settings } = item
  const videoRec = settings?.trackRecommendations?.video
  const audioRecs = settings?.trackRecommendations?.audio

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Body py={3} px={4}>
        <HStack gap={4}>
          {/* Иконка */}
          <Box p={2} borderRadius="md" bg="bg.subtle">
            <Icon as={LuFileVideo} boxSize={5} color="blue.400" />
          </Box>

          {/* Информация */}
          <VStack align="start" flex={1} gap={2}>
            <HStack justify="space-between" w="full">
              <Text fontWeight="medium" lineClamp={1}>
                {item.fileName}
              </Text>
              {item.demuxResult?.metadata && (
                <Text fontSize="sm" color="fg.subtle">
                  {formatBytes(item.demuxResult.metadata.totalSize)}
                </Text>
              )}
            </HStack>

            {/* Рекомендации */}
            {(videoRec || audioRecs) && (
              <HStack gap={2} flexWrap="wrap">
                {videoRec && (
                  <HStack gap={1}>
                    <Text fontSize="xs" color="fg.subtle">
                      Видео:
                    </Text>
                    <RecommendationBadge recommendation={videoRec} />
                  </HStack>
                )}
                {audioRecs &&
                  Object.entries(audioRecs).map(([idx, rec]) => (
                    <HStack key={idx} gap={1}>
                      <Text fontSize="xs" color="fg.subtle">
                        Аудио {idx}:
                      </Text>
                      <RecommendationBadge recommendation={rec} />
                    </HStack>
                  ))}
              </HStack>
            )}

            {/* Пропуск */}
            {settings?.skipTranscode && (
              <Badge colorPalette="gray" size="sm">
                <HStack gap={1}>
                  <Icon as={LuCircleCheck} boxSize={3} />
                  <Text>Пропустить транскодирование</Text>
                </HStack>
              </Badge>
            )}
          </VStack>

          {/* Действия */}
          <HStack gap={1}>
            {onEdit && (
              <Button size="sm" variant="ghost" onClick={onEdit}>
                Настройки
              </Button>
            )}
            {onRemove && (
              <Button size="sm" variant="ghost" colorPalette="red" onClick={onRemove}>
                <LuX />
              </Button>
            )}
          </HStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Предпросмотр очереди перед запуском
 *
 * Показывает список файлов с рекомендациями и позволяет:
 * - Изменить настройки для каждого файла
 * - Удалить файл из очереди
 * - Запустить транскодирование
 */
export function TranscodePreview({
  items,
  onStart,
  onCancel,
  onEditSettings,
  onRemove,
  isLoading = false,
}: TranscodePreviewProps) {
  const totalFiles = items.length
  const toTranscode = items.filter((item) => !item.settings?.skipTranscode).length
  const toSkip = totalFiles - toTranscode

  return (
    <VStack gap={4} align="stretch">
      {/* Статистика */}
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body py={3}>
          <HStack justify="space-between">
            <HStack gap={6}>
              <VStack gap={0} align="start">
                <Text fontSize="sm" color="fg.subtle">
                  Всего файлов
                </Text>
                <Text fontSize="lg" fontWeight="bold">
                  {totalFiles}
                </Text>
              </VStack>
              <VStack gap={0} align="start">
                <Text fontSize="sm" color="fg.subtle">
                  К транскодированию
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="purple.400">
                  {toTranscode}
                </Text>
              </VStack>
              {toSkip > 0 && (
                <VStack gap={0} align="start">
                  <Text fontSize="sm" color="fg.subtle">
                    Пропуск
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color="fg.muted">
                    {toSkip}
                  </Text>
                </VStack>
              )}
            </HStack>

            {/* Кнопки */}
            <HStack gap={2}>
              <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                Отмена
              </Button>
              <Button colorPalette="purple" onClick={onStart} loading={isLoading} disabled={toTranscode === 0}>
                <LuPlay />
                Начать
              </Button>
            </HStack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Список файлов */}
      <VStack gap={2} align="stretch">
        {items.map((item) => (
          <PreviewItem
            key={item.id}
            item={item}
            onEdit={onEditSettings ? () => onEditSettings(item.id) : undefined}
            onRemove={onRemove ? () => onRemove(item.id) : undefined}
          />
        ))}
      </VStack>
    </VStack>
  )
}

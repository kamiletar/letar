'use client'

/**
 * Карточка статуса кодирования для Sidebar
 * Показывает прогресс текущего кодирования, количество в очереди
 */

import { Badge, Box, HStack, Icon, Progress, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuLoader, LuPause, LuZap } from 'react-icons/lu'

import { useImportQueue } from '@/hooks/useImportQueue'

/**
 * Компонент карточки статуса кодирования
 * Отображается в Sidebar когда есть активный энкод или очередь
 */
export function EncodingStatusCard() {
  const { items, currentItem, pendingCount, isPaused, isProcessing, isLoading } = useImportQueue()

  // Не показываем если нет items или идёт загрузка
  if (isLoading || items.length === 0) {
    return null
  }

  // Общее количество активных (vmaf/preparing/transcoding/postprocess + pending)
  const inProgressStatuses = ['vmaf', 'preparing', 'transcoding', 'postprocess'] as const
  const processingItems = items.filter((i) =>
    inProgressStatuses.includes(i.status as (typeof inProgressStatuses)[number])
  )
  const activeCount = processingItems.length + pendingCount

  // Если нет активных и не на паузе — не показываем
  if (activeCount === 0 && !isPaused) {
    return null
  }

  // Название текущего аниме
  const animeName = currentItem?.selectedAnime?.russian || currentItem?.selectedAnime?.name || 'Обработка...'

  // Прогресс текущего item
  const progress = currentItem?.progress ?? 0

  // Текущий этап
  const getStageLabel = () => {
    if (!currentItem) {
      return ''
    }
    switch (currentItem.status) {
      case 'vmaf':
        return 'VMAF подбор'
      case 'preparing':
        return 'Подготовка'
      case 'transcoding':
        return currentItem.currentStage || 'Кодирование'
      case 'postprocess':
        return 'Постобработка'
      default:
        return currentItem.currentStage || 'Обработка'
    }
  }
  const stage = getStageLabel()

  return (
    <Link href="/transcode">
      <Box
        p={3}
        mx={2}
        mb={2}
        borderRadius="lg"
        bg={isPaused ? 'orange.950/30' : 'green.950/30'}
        border="1px"
        borderColor={isPaused ? 'orange.700/50' : 'green.700/50'}
        _hover={{ bg: isPaused ? 'orange.950/50' : 'green.950/50' }}
        transition="all 0.15s ease-out"
        cursor="pointer"
      >
        <VStack gap={2} align="stretch">
          {/* Заголовок */}
          <HStack justify="space-between" overflow="hidden">
            <HStack gap={2} minW={0} flex={1}>
              <Icon
                as={isPaused ? LuPause : isProcessing ? LuLoader : LuZap}
                boxSize={4}
                color={isPaused ? 'orange.400' : 'green.400'}
                animation={isProcessing && !isPaused ? 'spin 2s linear infinite' : undefined}
                flexShrink={0}
              />
              <Text fontSize="xs" fontWeight="semibold" color={isPaused ? 'orange.300' : 'green.300'} truncate>
                {isPaused ? 'Пауза' : 'Кодирование'}
              </Text>
            </HStack>
            {activeCount > 0 && (
              <Badge colorPalette={isPaused ? 'orange' : 'green'} size="xs" flexShrink={0}>
                {activeCount}
              </Badge>
            )}
          </HStack>

          {/* Текущее аниме */}
          {currentItem && (
            <>
              <Text fontSize="sm" fontWeight="medium" color="fg" lineClamp={1} title={animeName}>
                {animeName}
              </Text>

              {/* Этап и прогресс */}
              <HStack justify="space-between" fontSize="xs" color="fg.muted">
                <Text>{stage}</Text>
                <Text fontWeight="medium">{progress.toFixed(0)}%</Text>
              </HStack>

              {/* Прогресс бар */}
              <Progress.Root value={progress} size="xs" colorPalette={isPaused ? 'orange' : 'green'}>
                <Progress.Track bg={isPaused ? 'orange.900/50' : 'green.900/50'}>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </>
          )}

          {/* Если нет текущего item, но есть очередь на паузе */}
          {!currentItem && isPaused && pendingCount > 0 && (
            <Text fontSize="xs" color="orange.300">
              Нажмите, чтобы продолжить
            </Text>
          )}
        </VStack>
      </Box>
    </Link>
  )
}

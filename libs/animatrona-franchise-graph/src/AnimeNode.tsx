'use client'

/**
 * Кастомный узел React Flow для отображения аниме в графе франшизы
 *
 * Показывает постер, название, год, тип, статус в библиотеке.
 * HoverCard с подробностями при наведении.
 */

import { Badge, Box, HoverCard, HStack, Image, Portal, Progress, Text, VStack } from '@chakra-ui/react'
import { Handle, type NodeProps, Position } from '@xyflow/react'
import { memo } from 'react'
import { LuCheck, LuClock, LuLibrary, LuPause, LuPlay, LuX } from 'react-icons/lu'

import { useFranchiseGraphConfig } from './config'
import type { AnimeNodeData } from './types'
import { KIND_COLORS, KIND_LABELS } from './types'

/** Иконки статусов просмотра */
const STATUS_ICONS: Record<string, React.ElementType> = {
  watching: LuPlay,
  completed: LuCheck,
  on_hold: LuPause,
  dropped: LuX,
  planned: LuClock,
}

/** Цвета статусов */
const STATUS_COLORS: Record<string, string> = {
  watching: 'blue',
  completed: 'green',
  on_hold: 'yellow',
  dropped: 'red',
  planned: 'gray',
}

/** Компонент узла аниме для React Flow */
function AnimeNodeComponent(props: NodeProps) {
  const { selected } = props
  const data = props.data as AnimeNodeData
  const config = useFranchiseGraphConfig()
  const StatusIcon = data.watchStatus ? STATUS_ICONS[data.watchStatus] : null
  const statusColor = data.watchStatus ? STATUS_COLORS[data.watchStatus] : 'gray'
  const kindColor = KIND_COLORS[data.kind] || 'gray'

  return (
    <>
      {/* Входящая связь (слева) */}
      <Handle type="target" position={Position.Left} />

      <HoverCard.Root openDelay={300} closeDelay={100} positioning={{ placement: 'right' }}>
        <HoverCard.Trigger asChild>
          <Box
            w="180px"
            bg="bg.panel"
            borderRadius="lg"
            borderWidth="2px"
            borderColor={data.isCurrent ? 'blue.500' : selected ? 'purple.500' : 'border.muted'}
            boxShadow={data.isCurrent ? 'lg' : 'md'}
            overflow="hidden"
            transition="all 0.2s"
            _hover={{ borderColor: 'blue.400', transform: 'scale(1.02)' }}
            cursor="pointer"
            position="relative"
            opacity={data.isInLibrary ? 1 : 0.7}
          >
            {/* Порядковый номер */}
            {data.chronologicalOrder && (
              <Badge position="absolute" top="2" left="2" zIndex="1" colorPalette="blue" variant="solid" fontSize="2xs">
                #{data.chronologicalOrder}
              </Badge>
            )}

            {/* Статус в библиотеке */}
            {data.isInLibrary && (
              <Badge
                position="absolute"
                top="2"
                right="2"
                zIndex="1"
                colorPalette={statusColor}
                variant="solid"
                fontSize="2xs"
              >
                <HStack gap="1">
                  {StatusIcon && <StatusIcon size={12} />}
                  {!StatusIcon && <LuLibrary size={12} />}
                </HStack>
              </Badge>
            )}

            {/* Бейдж текущего аниме (если нет chronologicalOrder — показываем слева) */}
            {data.isCurrent && !data.chronologicalOrder && (
              <Badge position="absolute" top="2" left="2" zIndex="1" colorPalette="blue" variant="solid" fontSize="2xs">
                Текущее
              </Badge>
            )}

            {/* Постер */}
            <Box position="relative" h="140px" overflow="hidden">
              <Image
                src={data.imageUrl}
                alt={data.name}
                w="100%"
                h="100%"
                objectFit="cover"
                filter={data.isInLibrary ? 'none' : 'grayscale(100%)'}
                transition="filter 0.2s"
              />

              {/* Fallback если постер не загрузился */}
              {!data.imageUrl && (
                <Box
                  position="absolute"
                  inset="0"
                  bg="bg.subtle"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="fg.muted" fontSize="xs">
                    Нет постера
                  </Text>
                </Box>
              )}

              {/* Оверлей для текущего аниме */}
              {data.isCurrent && (
                <Box position="absolute" inset="0" bg="blue.500/20" borderBottom="3px solid" borderColor="blue.500" />
              )}
            </Box>

            {/* Информация */}
            <VStack p="2" gap="1" align="stretch">
              {/* Название */}
              <Text fontSize="xs" fontWeight="medium" lineClamp={2} minH="32px">
                {data.name}
              </Text>

              {/* Год и тип */}
              <HStack justify="space-between">
                <Text fontSize="2xs" color="fg.muted">
                  {data.year || '—'}
                </Text>
                <Badge colorPalette={kindColor} variant="subtle" size="sm">
                  {KIND_LABELS[data.kind] || data.kind}
                </Badge>
              </HStack>

              {/* Прогресс просмотра */}
              {data.watchProgress !== undefined && data.watchProgress > 0 && (
                <Progress.Root value={data.watchProgress} size="xs" colorPalette={statusColor}>
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              )}
            </VStack>
          </Box>
        </HoverCard.Trigger>

        {/* HoverCard с подробностями */}
        <Portal>
          <HoverCard.Positioner>
            <HoverCard.Content maxW="320px">
              <HoverCard.Arrow>
                <HoverCard.ArrowTip />
              </HoverCard.Arrow>
              <VStack align="stretch" gap="3">
                {/* Заголовок */}
                <Text fontWeight="semibold" fontSize="md">
                  {data.name}
                </Text>

                {/* Основная информация */}
                <HStack gap="2" flexWrap="wrap">
                  {data.year && (
                    <Badge colorPalette="gray" variant="subtle">
                      {data.year}
                    </Badge>
                  )}
                  <Badge colorPalette={kindColor} variant="subtle">
                    {KIND_LABELS[data.kind] || data.kind}
                  </Badge>
                  {data.chronologicalOrder && (
                    <Badge colorPalette="blue" variant="solid">
                      #{data.chronologicalOrder} в хронологии
                    </Badge>
                  )}
                </HStack>

                {/* Статус */}
                <HStack gap="2">
                  {data.isCurrent && (
                    <Badge colorPalette="blue" variant="solid">
                      Текущее аниме
                    </Badge>
                  )}
                  {data.isInLibrary && (
                    <Badge colorPalette="green" variant="subtle">
                      {config.libraryLabel}
                    </Badge>
                  )}
                  {!data.isInLibrary && (
                    <Badge colorPalette="gray" variant="outline">
                      {config.notInLibraryLabel}
                    </Badge>
                  )}
                </HStack>

                {/* Статус просмотра */}
                {data.watchStatus && (
                  <HStack gap="2">
                    {StatusIcon && <StatusIcon size={14} />}
                    <Text fontSize="sm" color="fg.muted">
                      {data.watchStatus === 'watching' && 'Смотрю'}
                      {data.watchStatus === 'completed' && 'Просмотрено'}
                      {data.watchStatus === 'on_hold' && 'Отложено'}
                      {data.watchStatus === 'dropped' && 'Брошено'}
                      {data.watchStatus === 'planned' && 'В планах'}
                      {data.watchProgress !== undefined && data.watchProgress > 0 && ` (${data.watchProgress}%)`}
                    </Text>
                  </HStack>
                )}

                {/* Подсказка */}
                <Text fontSize="xs" color="fg.subtle">
                  {data.isInLibrary ? 'Клик — открыть страницу аниме' : 'Клик — открыть на Shikimori'}
                </Text>
              </VStack>
            </HoverCard.Content>
          </HoverCard.Positioner>
        </Portal>
      </HoverCard.Root>

      {/* Исходящая связь (справа) */}
      <Handle type="source" position={Position.Right} />
    </>
  )
}

export const AnimeNode = memo(AnimeNodeComponent)

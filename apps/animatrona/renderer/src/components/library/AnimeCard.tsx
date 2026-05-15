'use client'

import { Badge, Box, Card, HStack, Icon, IconButton, Menu, Portal, Text, Tooltip, VStack } from '@chakra-ui/react'
import NextImage from 'next/image'
import NextLink from 'next/link'
import { memo, type MouseEvent, useCallback } from 'react'
import { LuCloud, LuEllipsisVertical, LuPlay, LuRefreshCw, LuStar, LuTrash2, LuUpload } from 'react-icons/lu'

import type { WatchStatus } from '@/generated/prisma'
import { formatBytes } from '@/lib/format-utils'
import { getImageSrc } from '@/lib/image-loader'

import { WatchStatusBadge } from './WatchStatusSelector'
import { WatchStatusSubmenu } from './WatchStatusSubmenu'

interface AnimeCardProps {
  id: string
  name: string
  originalName?: string | null
  year?: number | null
  status: 'ONGOING' | 'COMPLETED' | 'ANNOUNCED'
  episodeCount: number
  rating?: number | null
  posterPath?: string | null
  genres?: string[]
  /** Статус просмотра */
  watchStatus?: WatchStatus
  /** Контент закреплён локально (false = только на удалённых пирах) */
  pinnedLocally?: boolean
  /** Суммарный размер IPFS контента (байты) */
  totalIpfsSize?: number
  /** Размер по категориям (байты) */
  ipfsSizeBreakdown?: { video: number; audio: number; subtitles: number; fonts: number }
  /** Колбэк для продолжения просмотра */
  onPlay?: (id: string) => void
  /** Колбэк для экспорта */
  onExport?: (id: string) => void
  /** Колбэк для обновления метаданных */
  onRefreshMetadata?: (id: string) => void
  /** Колбэк для удаления */
  onDelete?: (id: string) => void
  /** Колбэк для изменения статуса просмотра */
  onWatchStatusChange?: (id: string, status: WatchStatus) => void
}

const statusLabels = {
  ONGOING: { label: 'Выходит', color: 'green' },
  COMPLETED: { label: 'Завершён', color: 'blue' },
  ANNOUNCED: { label: 'Анонс', color: 'yellow' },
}

/**
 * Склонение слова "эпизод" в зависимости от числа
 */
function pluralizeEpisodes(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod100 >= 11 && mod100 <= 14) {
    return `${count} эпизодов`
  }
  if (mod10 === 1) {
    return `${count} эпизод`
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${count} эпизода`
  }
  return `${count} эпизодов`
}

/**
 * Карточка аниме в каталоге
 * Обёрнута в React.memo для предотвращения лишних ререндеров при фильтрации
 *
 * Quick Actions появляются при наведении на постер (кнопка ⋮)
 */
export const AnimeCard = memo(function AnimeCard({
  id,
  name,
  originalName,
  year,
  status,
  episodeCount,
  rating,
  posterPath,
  genres = [],
  watchStatus,
  pinnedLocally = true,
  totalIpfsSize,
  ipfsSizeBreakdown,
  onPlay,
  onExport,
  onRefreshMetadata,
  onDelete,
  onWatchStatusChange,
}: AnimeCardProps) {
  const statusInfo = statusLabels[status]

  // Обработчик клика по меню (предотвращает переход по ссылке)
  const handleMenuClick = useCallback((e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return (
    <Card.Root
      height={'100%'}
      bg="bg.panel"
      border="1px"
      borderColor="border.subtle"
      overflow="hidden"
      _hover={{
        borderColor: 'primary.solid',
        transform: 'translateY(-4px)',
        shadow: 'xl',
      }}
      _active={{
        transform: 'translateY(-2px) scale(0.98)',
        shadow: 'lg',
      }}
      transition="all 0.15s ease-out"
      className={'group'}
      asChild
    >
      <NextLink href={`/library/${id}`}>
        {/* Постер — нативный aspectRatio для работы с NextImage fill */}
        <Box position="relative" w="full" css={{ aspectRatio: '2/3' }} overflow="hidden">
          {posterPath ? (
            <NextImage
              src={getImageSrc(posterPath)}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <Box w="full" h="full" bg="bg.muted" display="flex" alignItems="center" justifyContent="center">
              <Icon as={LuPlay} boxSize={12} color="fg.subtle" />
            </Box>
          )}

          {/* Quick Actions меню (появляется при hover) */}
          <Box
            position="absolute"
            top={2}
            right={rating ? 12 : 2}
            opacity={0}
            _groupHover={{ opacity: 1 }}
            transition="opacity 0.15s"
            onClick={handleMenuClick}
          >
            <Menu.Root>
              <Menu.Trigger asChild>
                <IconButton
                  size="xs"
                  variant="solid"
                  bg="overlay.backdrop"
                  color="fg"
                  _hover={{ bg: 'overlay.heavy' }}
                  aria-label="Действия"
                >
                  <LuEllipsisVertical />
                </IconButton>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content bg="bg.muted" borderColor="border" minW="180px">
                    {/* Подменю статуса просмотра */}
                    {onWatchStatusChange && watchStatus && (
                      <>
                        <WatchStatusSubmenu
                          watchStatus={watchStatus}
                          onWatchStatusChange={(status) => onWatchStatusChange(id, status)}
                        />
                        <Menu.Separator />
                      </>
                    )}
                    <Menu.Item
                      value="play"
                      onClick={() => onPlay?.(id)}
                      cursor="pointer"
                      _hover={{ bg: 'state.hover' }}
                    >
                      <HStack gap={2}>
                        <Icon as={LuPlay} color="status.success" />
                        <Text>Продолжить просмотр</Text>
                      </HStack>
                    </Menu.Item>
                    <Menu.Item
                      value="export"
                      onClick={() => onExport?.(id)}
                      cursor="pointer"
                      _hover={{ bg: 'state.hover' }}
                    >
                      <HStack gap={2}>
                        <Icon as={LuUpload} color="status.info" />
                        <Text>Экспорт</Text>
                      </HStack>
                    </Menu.Item>
                    <Menu.Item
                      value="refresh"
                      onClick={() => onRefreshMetadata?.(id)}
                      cursor="pointer"
                      _hover={{ bg: 'state.hover' }}
                    >
                      <HStack gap={2}>
                        <Icon as={LuRefreshCw} color="primary.fg" />
                        <Text>Обновить метаданные</Text>
                      </HStack>
                    </Menu.Item>
                    <Menu.Separator />
                    <Menu.Item
                      value="delete"
                      onClick={() => onDelete?.(id)}
                      cursor="pointer"
                      _hover={{ bg: 'error.subtle' }}
                    >
                      <HStack gap={2}>
                        <Icon as={LuTrash2} color="error.fg" />
                        <Text color="error.fg">Удалить</Text>
                      </HStack>
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </Box>

          {/* Рейтинг */}
          {rating && (
            <Badge
              position="absolute"
              top={2}
              right={2}
              colorPalette="yellow"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <Icon as={LuStar} boxSize={3} />
              {rating.toFixed(1)}
            </Badge>
          )}

          {/* Статус */}
          <Badge position="absolute" top={2} left={2} colorPalette={statusInfo.color}>
            {statusInfo.label}
          </Badge>

          {/* Бейдж local/remote (Cloud Library) */}
          {!pinnedLocally && (
            <Badge
              position="absolute"
              bottom={8}
              right={2}
              colorPalette="blue"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <Icon as={LuCloud} boxSize={3} />
              Облако
            </Badge>
          )}

          {/* Бейдж статуса просмотра */}
          {watchStatus && (
            <Box position="absolute" bottom={8} left={2}>
              <WatchStatusBadge status={watchStatus} size="sm" />
            </Box>
          )}

          {/* Оверлей с эпизодами и размером */}
          <Box position="absolute" bottom={0} left={0} right={0} bg="overlay.heavy" py={1} px={2}>
            <HStack justify="space-between">
              <Text fontSize="xs" color="white">
                {pluralizeEpisodes(episodeCount)}
              </Text>
              {totalIpfsSize ? (
                <Tooltip.Root openDelay={300}>
                  <Tooltip.Trigger asChild>
                    <Text fontSize="xs" color="white" cursor="default">
                      {formatBytes(totalIpfsSize)}
                    </Text>
                  </Tooltip.Trigger>
                  <Portal>
                    <Tooltip.Positioner>
                      <Tooltip.Content>
                        {ipfsSizeBreakdown && (
                          <VStack align="start" gap={0} fontSize="xs">
                            {ipfsSizeBreakdown.video > 0 && <Text>Видео: {formatBytes(ipfsSizeBreakdown.video)}</Text>}
                            {ipfsSizeBreakdown.audio > 0 && <Text>Аудио: {formatBytes(ipfsSizeBreakdown.audio)}</Text>}
                            {ipfsSizeBreakdown.subtitles > 0 && (
                              <Text>Субтитры: {formatBytes(ipfsSizeBreakdown.subtitles)}</Text>
                            )}
                            {ipfsSizeBreakdown.fonts > 0 && <Text>Шрифты: {formatBytes(ipfsSizeBreakdown.fonts)}</Text>}
                          </VStack>
                        )}
                      </Tooltip.Content>
                    </Tooltip.Positioner>
                  </Portal>
                </Tooltip.Root>
              ) : null}
            </HStack>
          </Box>
        </Box>

        {/* Информация — фиксированная высота для единообразия карточек */}
        <Card.Body p={3}>
          <Text fontWeight="semibold" lineClamp={3}>
            {name}
          </Text>
        </Card.Body>
        <Card.Footer p={3} pt={0}>
          <VStack align="stretch" gap={1} h="full">
            {/* Всегда показываем строку originalName для единообразной высоты */}
            <Text fontSize="xs" color="fg.subtle" lineClamp={1} minH="1.2em">
              {originalName || '\u00A0'}
            </Text>
            <HStack gap={2} mt="auto">
              <Text fontSize="xs" color="fg.muted">
                {year || '—'}
              </Text>
              {genres.slice(0, 2).map((genre) => (
                <Badge key={genre} size="sm" colorPalette="purple" variant="subtle">
                  {genre}
                </Badge>
              ))}
            </HStack>
          </VStack>
        </Card.Footer>
      </NextLink>
    </Card.Root>
  )
})

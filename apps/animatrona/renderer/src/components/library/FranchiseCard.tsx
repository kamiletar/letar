'use client'

import { Badge, Box, Card, CloseButton, Dialog, Grid, HStack, IconButton, Menu, Portal, Text } from '@chakra-ui/react'
import NextImage from 'next/image'
import NextLink from 'next/link'
import { type MouseEvent, useCallback, useState } from 'react'
import { LuEllipsisVertical, LuFilm, LuPlay, LuRefreshCw, LuTrash2, LuTv, LuUpload } from 'react-icons/lu'

import type { WatchStatus } from '@/generated/prisma'

import { WatchStatusSubmenu } from './WatchStatusSubmenu'

/** Маппинг типов аниме на иконки */
const KIND_ICONS: Record<string, typeof LuTv> = {
  tv: LuTv,
  movie: LuFilm,
  ova: LuPlay,
  ona: LuPlay,
  special: LuPlay,
}

interface FranchiseAnime {
  id: string
  title: string
  posterUrl?: string | null
  kind?: string | null
  year?: number | null
  episodesTotal?: number | null
  episodesLoaded?: number
  watchStatus?: WatchStatus
}

/** Незагруженное аниме из связей */
interface MissingAnime {
  shikimoriId: number
  title: string
  posterUrl?: string | null
  kind?: string | null
  year?: number | null
}

interface FranchiseCardProps {
  /** Название франшизы */
  name: string
  /** Главное аниме (первое в списке) */
  mainAnime: FranchiseAnime
  /** Связанные аниме */
  relatedAnimes: FranchiseAnime[]
  /** Незагруженные аниме франшизы */
  missingAnimes?: MissingAnime[]
  /** Открыта ли карточка по умолчанию (не используется, для совместимости) */
  defaultOpen?: boolean
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

/** Минимальная карточка для грида внутри модала франшизы */
function FranchiseModalCard({
  anime,
  isMissing = false,
}: {
  anime: { title: string; posterUrl?: string | null; kind?: string | null; year?: number | null }
  isMissing?: boolean
}) {
  const KindIcon = anime.kind ? (KIND_ICONS[anime.kind] ?? LuPlay) : LuPlay

  return (
    <Box
      position="relative"
      css={{ aspectRatio: '2/3' }}
      borderRadius="md"
      overflow="hidden"
      filter={isMissing ? 'grayscale(100%)' : undefined}
      opacity={isMissing ? 0.5 : 1}
      _hover={!isMissing ? { outline: '2px solid', outlineColor: 'purple.400' } : undefined}
      transition="all 0.15s ease-out"
      cursor={isMissing ? 'default' : 'pointer'}
    >
      {anime.posterUrl
        ? <NextImage src={anime.posterUrl} alt={anime.title} fill sizes="140px" style={{ objectFit: 'cover' }} />
        : (
          <Box w="full" h="full" bg="bg.muted" display="flex" alignItems="center" justifyContent="center">
            <KindIcon size={32} color="var(--chakra-colors-fg-subtle)" />
          </Box>
        )}

      {/* Оверлей снизу с названием */}
      <Box position="absolute" bottom={0} left={0} right={0} bg="overlay.heavy" p={2}>
        <Text fontSize="2xs" fontWeight="medium" lineClamp={2} color="white">
          {anime.title}
        </Text>
        {anime.year && (
          <Text fontSize="2xs" color="whiteAlpha.700">
            {anime.year}
          </Text>
        )}
      </Box>
    </Box>
  )
}

/**
 * Карточка франшизы — плитка с постером и стопкой дополнительных постеров.
 * При клике открывает Dialog со всеми аниме франшизы (загруженными и незагруженными).
 */
export function FranchiseCard({
  name,
  mainAnime,
  relatedAnimes,
  missingAnimes = [],
  defaultOpen: _defaultOpen,
  onPlay,
  onExport,
  onRefreshMetadata,
  onDelete,
  onWatchStatusChange,
}: FranchiseCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Обработчик клика по меню (предотвращает открытие диалога франшизы)
  const handleMenuClick = useCallback((e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // Общее количество включая незагруженные
  const totalCount = relatedAnimes.length + 1 + missingAnimes.length
  const loadedCount = relatedAnimes.filter((a) => a.episodesLoaded && a.episodesLoaded > 0).length + 1

  // Постеры для стека (от 2-го элемента, исключая главный)
  const stackPosters = relatedAnimes.flatMap((a) => (a.posterUrl ? [a.posterUrl] : [])).slice(0, 2)

  // Все загруженные аниме для диалога
  const allLoaded = [mainAnime, ...relatedAnimes]

  const MainKindIcon = mainAnime.kind ? (KIND_ICONS[mainAnime.kind] ?? LuPlay) : LuPlay

  return (
    <>
      <Card.Root
        height="100%"
        bg="bg.panel"
        border="1px"
        borderColor="border.subtle"
        overflow="visible"
        _hover={{
          borderColor: 'purple.solid',
          transform: 'translateY(-4px)',
          shadow: 'xl',
        }}
        _active={{
          transform: 'translateY(-2px) scale(0.98)',
          shadow: 'lg',
        }}
        transition="all 0.15s ease-out"
        cursor="pointer"
        onClick={() => setIsOpen(true)}
        className="group"
      >
        {/* Постерная область со стеком призрачных постеров */}
        <Box position="relative" w="full" css={{ aspectRatio: '2/3' }} overflow="visible">
          {/* Ghost poster 2 — дальний (если ≥3 аниме в группе) */}
          {stackPosters[1] && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              transform="translate(8px, 6px)"
              zIndex={0}
              filter="brightness(0.4)"
              borderRadius="md"
              overflow="hidden"
            >
              <NextImage src={stackPosters[1]} alt="" fill sizes="200px" style={{ objectFit: 'cover' }} />
            </Box>
          )}

          {/* Ghost poster 1 — ближний (если ≥2 аниме в группе) */}
          {stackPosters[0] && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              transform="translate(4px, 3px)"
              zIndex={1}
              filter="brightness(0.55)"
              borderRadius="md"
              overflow="hidden"
            >
              <NextImage src={stackPosters[0]} alt="" fill sizes="200px" style={{ objectFit: 'cover' }} />
            </Box>
          )}

          {/* Главный постер */}
          <Box position="absolute" top={0} left={0} right={0} bottom={0} zIndex={2} borderRadius="md" overflow="hidden">
            {mainAnime.posterUrl
              ? (
                <NextImage
                  src={mainAnime.posterUrl}
                  alt={mainAnime.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 200px"
                  style={{ objectFit: 'cover' }}
                />
              )
              : (
                <Box w="full" h="full" bg="bg.muted" display="flex" alignItems="center" justifyContent="center">
                  <MainKindIcon size={48} color="var(--chakra-colors-fg-subtle)" />
                </Box>
              )}
          </Box>

          {/* Бейдж: количество загруженных / общее */}
          <Badge colorPalette="purple" variant="solid" size="sm" position="absolute" top={2} left={2} zIndex={3}>
            {loadedCount}/{totalCount} ч.
          </Badge>

          {/* Quick Actions меню (появляется при hover) */}
          <Box
            position="absolute"
            top={2}
            right={2}
            zIndex={4}
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
                    {onWatchStatusChange && mainAnime.watchStatus && (
                      <>
                        <WatchStatusSubmenu
                          watchStatus={mainAnime.watchStatus}
                          onWatchStatusChange={(status) => onWatchStatusChange(mainAnime.id, status)}
                        />
                        <Menu.Separator />
                      </>
                    )}
                    <Menu.Item
                      value="play"
                      onClick={() => onPlay?.(mainAnime.id)}
                      cursor="pointer"
                      _hover={{ bg: 'state.hover' }}
                    >
                      <HStack gap={2}>
                        <LuPlay color="var(--chakra-colors-status-success)" />
                        <Text>Продолжить просмотр</Text>
                      </HStack>
                    </Menu.Item>
                    <Menu.Item
                      value="export"
                      onClick={() => onExport?.(mainAnime.id)}
                      cursor="pointer"
                      _hover={{ bg: 'state.hover' }}
                    >
                      <HStack gap={2}>
                        <LuUpload color="var(--chakra-colors-status-info)" />
                        <Text>Экспорт</Text>
                      </HStack>
                    </Menu.Item>
                    <Menu.Item
                      value="refresh"
                      onClick={() => onRefreshMetadata?.(mainAnime.id)}
                      cursor="pointer"
                      _hover={{ bg: 'state.hover' }}
                    >
                      <HStack gap={2}>
                        <LuRefreshCw color="var(--chakra-colors-primary-fg)" />
                        <Text>Обновить метаданные</Text>
                      </HStack>
                    </Menu.Item>
                    <Menu.Separator />
                    <Menu.Item
                      value="delete"
                      onClick={() => onDelete?.(mainAnime.id)}
                      cursor="pointer"
                      _hover={{ bg: 'error.subtle' }}
                    >
                      <HStack gap={2}>
                        <LuTrash2 color="var(--chakra-colors-error-fg)" />
                        <Text color="error.fg">Удалить</Text>
                      </HStack>
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </Box>

          {/* Оверлей снизу: «N частей» */}
          <Box position="absolute" bottom={0} left={0} right={0} zIndex={3} bg="overlay.heavy" py={1} px={2}>
            <Text fontSize="xs" color="white" fontWeight="medium">
              {totalCount} {totalCount === 1 ? 'часть' : totalCount <= 4 ? 'части' : 'частей'}
            </Text>
          </Box>
        </Box>

        {/* Название франшизы */}
        <Card.Body p={3}>
          <Text fontWeight="semibold" fontSize="sm" lineClamp={3}>
            {name}
          </Text>
        </Card.Body>

        {/* Прогресс загрузки */}
        <Card.Footer p={3} pt={0}>
          <Text fontSize="xs" color="fg.subtle">
            {loadedCount} из {totalCount} загружено
          </Text>
        </Card.Footer>
      </Card.Root>

      {/* Диалог со всеми аниме франшизы */}
      <Dialog.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)} size="xl">
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{name}</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <CloseButton />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body pb={6}>
                <Grid templateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap={3}>
                  {/* Загруженные аниме — кликабельные */}
                  {allLoaded.map((anime) => (
                    <NextLink key={anime.id} href={`/library/${anime.id}`}>
                      <FranchiseModalCard anime={anime} />
                    </NextLink>
                  ))}

                  {/* Незагруженные аниме — grayscale, без ссылки */}
                  {missingAnimes.map((anime) => <FranchiseModalCard key={anime.shikimoriId} anime={anime} isMissing />)}
                </Grid>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}

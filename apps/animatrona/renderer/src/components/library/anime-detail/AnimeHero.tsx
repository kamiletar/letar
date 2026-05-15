'use client'

/**
 * Hero секция страницы аниме (desktop)
 *
 * Wrapper над AnimeHeroBase из @letar/animatrona-ui.
 * Добавляет: progress bar на постере, watchStatus badge,
 * play target CTA, ActionMenu.
 */

import type {
  AnimeStatus,
  Genre,
  GenreOnAnime,
  Theme,
  ThemeOnAnime,
  WatchProgress,
  WatchStatus,
} from '@/generated/prisma'
import { formatBytes } from '@/lib/format-utils'
import { toMediaUrl } from '@/lib/media-url'
import { Badge, Box, Button, HStack, Icon, Portal, Text, Tooltip, VStack } from '@chakra-ui/react'
import { AnimeHeroBase } from '@letar/animatrona-ui'
import { getAnimeStatusConfig } from '@letar/animatrona-utils'
import { type ReactNode, useMemo } from 'react'
import { LuCalendar, LuCheck, LuClock, LuPause, LuPlay, LuStar, LuX } from 'react-icons/lu'

import { useRouter } from 'next/navigation'

import { ActionMenu, type ActionMenuProps } from './ActionMenu'

/** Конфигурация статусов просмотра */
const watchStatusLabels: Record<WatchStatus, { label: string; color: string; icon: React.ElementType }> = {
  NOT_STARTED: { label: 'Не начато', color: 'gray', icon: LuPlay },
  WATCHING: { label: 'Смотрю', color: 'blue', icon: LuClock },
  COMPLETED: { label: 'Просмотрено', color: 'green', icon: LuCheck },
  ON_HOLD: { label: 'Отложено', color: 'yellow', icon: LuPause },
  DROPPED: { label: 'Брошено', color: 'red', icon: LuX },
  PLANNED: { label: 'Запланировано', color: 'purple', icon: LuCalendar },
}

export interface AnimeHeroProps {
  /** Название аниме */
  name: string
  /** Оригинальное название */
  originalName?: string | null
  /** Год выхода */
  year?: number | null
  /** Статус аниме (опционален — discover не знает AnimeStatus) */
  status?: AnimeStatus
  /** Статус просмотра */
  watchStatus?: WatchStatus
  /** Дата отметки «Просмотрено» */
  watchedAt?: Date | string | null
  /** Рейтинг */
  rating?: number | null
  /** Количество эпизодов */
  episodeCount: number
  /** Загруженные эпизоды */
  loadedEpisodeCount: number
  /** Суммарный размер IPFS контента (байты) */
  totalIpfsSize?: number
  /** Размер по категориям (байты) */
  ipfsSizeBreakdown?: { video: number; audio: number; subtitles: number; fonts: number }
  /** Жанры (связи из БД) */
  genres?: (GenreOnAnime & { genre: Genre })[]
  /** Жанры как строки (альтернатива genres — для discover) */
  genreNames?: string[]
  /** Темы */
  themes?: (ThemeOnAnime & { theme: Theme })[]
  /** Путь к постеру (оборачивается в toMediaUrl) */
  posterPath?: string | null
  /** Готовый URL постера (альтернатива posterPath — для discover) */
  posterUrl?: string | null
  /** Прогресс просмотра */
  watchProgress?: WatchProgress[]
  /** Эпизоды для определения куда вести кнопку */
  episodes?: Array<{ id: string; number: number; durationMs: number | null }>
  /** Callbacks для ActionMenu (опционален — discover не использует) */
  actionMenuProps?: Omit<ActionMenuProps, 'hasEpisodes'>
  /** Слот для кастомных CTA кнопок (заменяет Play + ActionMenu) */
  ctaSlot?: ReactNode
}

/** Форматирует время в MM:SS */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** Определяет целевой эпизод и информацию для CTA */
function getPlayTarget(
  episodes: AnimeHeroProps['episodes'],
  watchProgress: AnimeHeroProps['watchProgress']
): {
  episodeId: string
  label: string
  isContinue: boolean
} | null {
  if (!episodes || episodes.length === 0) {
    return null
  }

  // Находим последний незавершённый прогресс (>10 сек)
  const lastInProgress = watchProgress?.find((p) => !p.completed && p.currentTime > 10)

  if (lastInProgress) {
    const episode = episodes.find((ep) => ep.id === lastInProgress.episodeId)
    if (episode) {
      return {
        episodeId: episode.id,
        label: `Продолжить Эп.${episode.number} — ${formatTime(lastInProgress.currentTime)}`,
        isContinue: true,
      }
    }
  }

  // Находим первый непросмотренный эпизод
  const firstUnwatched = episodes.find((ep) => !watchProgress?.find((p) => p.episodeId === ep.id)?.completed)

  if (firstUnwatched) {
    if (firstUnwatched.number === 1 && !watchProgress?.length) {
      return {
        episodeId: firstUnwatched.id,
        label: 'Начать смотреть',
        isContinue: false,
      }
    }
    return {
      episodeId: firstUnwatched.id,
      label: `Смотреть Эп.${firstUnwatched.number}`,
      isContinue: false,
    }
  }

  // Все просмотрены — предлагаем пересмотреть первый
  return {
    episodeId: episodes[0].id,
    label: 'Пересмотреть',
    isContinue: false,
  }
}

export function AnimeHero({
  name,
  originalName,
  year,
  status,
  watchStatus,
  watchedAt,
  rating,
  episodeCount,
  loadedEpisodeCount,
  totalIpfsSize,
  ipfsSizeBreakdown,
  genres,
  genreNames: genreNamesProp,
  themes,
  posterPath,
  posterUrl: posterUrlProp,
  watchProgress,
  episodes,
  actionMenuProps,
  ctaSlot,
}: AnimeHeroProps) {
  const router = useRouter()
  const statusInfo = getAnimeStatusConfig(status)
  const watchStatusInfo = watchStatus ? watchStatusLabels[watchStatus] : null
  const posterUrl = posterUrlProp ?? (posterPath ? toMediaUrl(posterPath) : null)

  // Вычисляем общий прогресс (% просмотренных эпизодов)
  const watchedCount = watchProgress?.filter((p) => p.completed).length || 0
  const totalCount = loadedEpisodeCount || episodeCount || 1
  const overallProgress = (watchedCount / totalCount) * 100

  // Определяем куда вести кнопку
  const playTarget = useMemo(() => getPlayTarget(episodes, watchProgress), [episodes, watchProgress])

  // Жанры и темы как строка
  const genreNames = genreNamesProp ?? genres?.map((g) => g.genre.name) ?? []
  const themeNames = themes?.map((t) => t.theme.name) ?? []
  const allTagsText = [...genreNames, ...themeNames].join(', ')

  return (
    <AnimeHeroBase
      name={name}
      originalName={originalName}
      posterUrl={posterUrl}
      posterOverlaySlot={
        overallProgress > 0 ? (
          <Box position="absolute" bottom={0} left={0} right={0} h="4px" bg="blackAlpha.600" borderBottomRadius="lg">
            <Box
              w={`${overallProgress}%`}
              h="full"
              bg="purple.500"
              borderBottomRadius={overallProgress >= 100 ? 'lg' : undefined}
              borderBottomLeftRadius="lg"
              transition="width 0.3s ease-out"
            />
          </Box>
        ) : undefined
      }
      badgesSlot={
        <HStack gap={2} flexWrap="wrap" justify={{ base: 'center', sm: 'start' }}>
          {statusInfo && (
            <Badge colorPalette={statusInfo.colorPalette} size="md">
              {statusInfo.label}
            </Badge>
          )}
          {rating && (
            <Badge colorPalette="yellow" display="flex" alignItems="center" gap={1}>
              <Icon as={LuStar} boxSize={3} />
              {rating.toFixed(1)}
            </Badge>
          )}
          {/* Статус просмотра (не показываем NOT_STARTED) */}
          {watchStatusInfo && watchStatus !== 'NOT_STARTED' && (
            <Badge colorPalette={watchStatusInfo.color} display="flex" alignItems="center" gap={1}>
              <Icon as={watchStatusInfo.icon} boxSize={3} />
              {watchStatusInfo.label}
              {watchStatus === 'COMPLETED' && watchedAt && (
                <Text as="span" fontWeight="normal" opacity={0.8}>
                  {new Date(watchedAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              )}
            </Badge>
          )}
        </HStack>
      }
      metaSlot={
        <HStack gap={2} color="fg.subtle" fontSize="sm" flexWrap="wrap" justify={{ base: 'center', sm: 'start' }}>
          {year && <Text>{year}</Text>}
          {year && <Text>•</Text>}
          <Text>
            {loadedEpisodeCount}
            {episodeCount > 0 && loadedEpisodeCount !== episodeCount && ` / ${episodeCount}`} эп.
          </Text>
          {totalIpfsSize ? (
            <>
              <Text>•</Text>
              <Tooltip.Root openDelay={300}>
                <Tooltip.Trigger asChild>
                  <Text cursor="default">{formatBytes(totalIpfsSize)}</Text>
                </Tooltip.Trigger>
                {ipfsSizeBreakdown && (
                  <Portal>
                    <Tooltip.Positioner>
                      <Tooltip.Content>
                        <VStack align="start" gap={0} fontSize="xs">
                          {ipfsSizeBreakdown.video > 0 && <Text>Видео: {formatBytes(ipfsSizeBreakdown.video)}</Text>}
                          {ipfsSizeBreakdown.audio > 0 && <Text>Аудио: {formatBytes(ipfsSizeBreakdown.audio)}</Text>}
                          {ipfsSizeBreakdown.subtitles > 0 && (
                            <Text>Субтитры: {formatBytes(ipfsSizeBreakdown.subtitles)}</Text>
                          )}
                          {ipfsSizeBreakdown.fonts > 0 && <Text>Шрифты: {formatBytes(ipfsSizeBreakdown.fonts)}</Text>}
                        </VStack>
                      </Tooltip.Content>
                    </Tooltip.Positioner>
                  </Portal>
                )}
              </Tooltip.Root>
            </>
          ) : null}
          {allTagsText && (
            <>
              <Text>•</Text>
              <Text lineClamp={1}>{allTagsText}</Text>
            </>
          )}
        </HStack>
      }
      ctaSlot={
        <HStack mt={3} gap={2} flexWrap="wrap" justify={{ base: 'center', sm: 'start' }}>
          {ctaSlot ?? (
            <>
              {playTarget ? (
                <Button
                  colorPalette="purple"
                  size={{ base: 'md', md: 'lg' }}
                  onClick={() =>
                    router.push(`/watch/${playTarget.episodeId}${playTarget.isContinue ? '?autoResume=true' : ''}`)
                  }
                >
                  <Icon as={LuPlay} />
                  {playTarget.label}
                </Button>
              ) : (
                <Button colorPalette="purple" size={{ base: 'md', md: 'lg' }} disabled>
                  <Icon as={LuPlay} />
                  Нет эпизодов
                </Button>
              )}

              {actionMenuProps && <ActionMenu {...actionMenuProps} hasEpisodes={!!episodes && episodes.length > 0} />}
            </>
          )}
        </HStack>
      }
    />
  )
}

'use client'

/**
 * Карточка аниме из результатов поиска Shikimori
 */

import { Badge, Box, HStack, Image, Text, VStack } from '@chakra-ui/react'
import { LuBookOpen, LuStar } from 'react-icons/lu'

import type { ShikimoriAnimePreview } from '@/types/electron'

interface ShikimoriAnimeCardProps {
  anime: ShikimoriAnimePreview
  isSelected: boolean
  onClick: () => void
  /** Аниме уже есть в библиотеке */
  isInLibrary?: boolean
  /** Количество эпизодов в библиотеке */
  libraryEpisodeCount?: number
}

/**
 * Форматирует статус аниме
 */
function formatStatus(status: string): { label: string; color: string } {
  switch (status) {
    case 'ongoing':
      return { label: 'Онгоинг', color: 'green' }
    case 'released':
      return { label: 'Завершён', color: 'blue' }
    case 'anons':
      return { label: 'Анонс', color: 'yellow' }
    default:
      return { label: status, color: 'gray' }
  }
}

/**
 * Форматирует тип аниме
 */
function formatKind(kind: string | null): string {
  if (!kind) {
    return ''
  }
  switch (kind) {
    case 'tv':
      return 'TV'
    case 'movie':
      return 'Фильм'
    case 'ova':
      return 'OVA'
    case 'ona':
      return 'ONA'
    case 'special':
      return 'Спешл'
    case 'music':
      return 'Клип'
    default:
      return kind.toUpperCase()
  }
}

/**
 * Карточка результата поиска аниме
 */
/** Формирует полный URL постера */
function getPosterUrl(mainUrl: string | undefined): string | null {
  if (!mainUrl) {
    return null
  }
  // Если URL уже полный — возвращаем как есть
  if (mainUrl.startsWith('http://') || mainUrl.startsWith('https://')) {
    return mainUrl
  }
  // Иначе добавляем домен
  return `https://shikimori.one${mainUrl}`
}

export function ShikimoriAnimeCard({
  anime,
  isSelected,
  onClick,
  isInLibrary,
  libraryEpisodeCount,
}: ShikimoriAnimeCardProps) {
  const statusInfo = formatStatus(anime.status)
  const posterUrl = getPosterUrl(anime.poster?.mainUrl)
  const isDisabled = !!isInLibrary

  const hoverStyle = isDisabled
    ? undefined
    : {
      bg: isSelected ? 'purple.900/50' : 'bg.subtle',
      borderColor: isSelected ? 'purple.500' : 'border.subtle',
    }

  const activeStyle = isDisabled
    ? undefined
    : {
      transform: 'scale(0.98)',
      bg: isSelected ? 'purple.900/70' : 'bg.subtle',
    }

  return (
    <Box
      as="button"
      onClick={isDisabled ? undefined : onClick}
      w="full"
      p={3}
      bg={isSelected ? 'purple.900/50' : 'bg.subtle'}
      borderWidth="2px"
      borderColor={isSelected ? 'purple.500' : 'transparent'}
      borderRadius="lg"
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      opacity={isDisabled ? 0.5 : 1}
      textAlign="left"
      transition="all 0.1s ease-out"
      _hover={hoverStyle}
      _active={activeStyle}
      position="relative"
    >
      {/* Бейдж "В библиотеке" */}
      {isInLibrary && (
        <Badge
          position="absolute"
          top={2}
          right={2}
          colorPalette="teal"
          size="sm"
          display="flex"
          alignItems="center"
          gap={1}
        >
          <LuBookOpen size={10} />
          {libraryEpisodeCount !== undefined && libraryEpisodeCount > 0 ? `${libraryEpisodeCount} эп.` : 'В библиотеке'}
        </Badge>
      )}

      <HStack gap={3} align="start">
        {/* Постер */}
        <Box w="60px" h="85px" flexShrink={0} borderRadius="md" overflow="hidden" bg="bg.subtle">
          {posterUrl
            ? <Image src={posterUrl} alt={anime.russian ?? anime.name} w="full" h="full" objectFit="cover" />
            : <Box w="full" h="full" bg="bg.subtle" />}
        </Box>

        {/* Информация */}
        <VStack align="start" gap={1} flex={1} minW={0}>
          {/* Название */}
          <Text fontSize="sm" fontWeight="medium" color="fg" lineClamp={2}>
            {anime.russian ?? anime.name}
          </Text>

          {/* Оригинальное название */}
          {anime.russian && (
            <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
              {anime.name}
            </Text>
          )}

          {/* Мета-информация */}
          <HStack gap={2} flexWrap="wrap">
            {/* Рейтинг */}
            {anime.score && anime.score > 0 && (
              <HStack gap={1} color="yellow.400" fontSize="xs">
                <LuStar size={12} />
                <Text>{anime.score.toFixed(1)}</Text>
              </HStack>
            )}

            {/* Год */}
            {anime.airedOn?.year && (
              <Text fontSize="xs" color="fg.subtle">
                {anime.airedOn.year}
              </Text>
            )}

            {/* Тип */}
            {anime.kind && (
              <Text fontSize="xs" color="fg.subtle">
                {formatKind(anime.kind)}
              </Text>
            )}

            {/* Эпизоды */}
            {anime.episodes > 0 && (
              <Text fontSize="xs" color="fg.subtle">
                {anime.episodes} эп.
              </Text>
            )}
          </HStack>

          {/* Статус */}
          <Badge size="sm" colorPalette={statusInfo.color}>
            {statusInfo.label}
          </Badge>

          {/* Жанры */}
          {anime.genres.length > 0 && (
            <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
              {anime.genres
                .slice(0, 3)
                .map((g) => g.russian || g.name)
                .join(', ')}
            </Text>
          )}
        </VStack>
      </HStack>
    </Box>
  )
}

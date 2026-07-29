'use client'

import { Badge, Box, HStack, Icon, Image, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuDownload, LuFilm, LuPlay, LuTv } from 'react-icons/lu'

import { useRouter } from 'next/navigation'

/** Маппинг типов на русские названия */
const RELATION_KIND_LABELS: Record<string, string> = {
  SEQUEL: 'Продолжение',
  PREQUEL: 'Предыстория',
  SIDE_STORY: 'Побочная история',
  PARENT_STORY: 'Основа',
  SUMMARY: 'Краткое содержание',
  FULL_STORY: 'Полная версия',
  SPIN_OFF: 'Спин-офф',
  ADAPTATION: 'Адаптация',
  CHARACTER: 'Общие персонажи',
  ALTERNATIVE_VERSION: 'Альт. версия',
  ALTERNATIVE_SETTING: 'Альт. сеттинг',
  OTHER: 'Связано',
}

/** Маппинг типов на цвета */
const RELATION_KIND_COLORS: Record<string, string> = {
  SEQUEL: 'green',
  PREQUEL: 'blue',
  SIDE_STORY: 'purple',
  SPIN_OFF: 'orange',
  ADAPTATION: 'teal',
  OTHER: 'gray',
}

/** Маппинг типов аниме на иконки */
const KIND_ICONS: Record<string, typeof LuTv> = {
  tv: LuTv,
  movie: LuFilm,
  ova: LuPlay,
  ona: LuPlay,
  special: LuPlay,
}

interface RelatedAnimeRowProps {
  /** Название аниме */
  name: string | null
  /** Тип связи */
  relationKind: string
  /** Год выпуска */
  year?: number | null
  /** Тип аниме (tv, movie, ova) */
  kind?: string | null
  /** URL постера */
  posterUrl?: string | null
  /** ID в локальной БД (если загружено) */
  localAnimeId?: string | null
  /** Shikimori ID */
  shikimoriId: number
  /** Обработчик клика на "Загрузить" */
  onDownloadClick?: () => void
}

/**
 * Строка связанного аниме для списка RelatedAnimeList
 */
export function RelatedAnimeRow({
  name,
  relationKind,
  year,
  kind,
  posterUrl,
  localAnimeId,
  shikimoriId,
  onDownloadClick,
}: RelatedAnimeRowProps) {
  const router = useRouter()
  const isLoaded = !!localAnimeId
  const label = RELATION_KIND_LABELS[relationKind] || 'Связано'
  const color = RELATION_KIND_COLORS[relationKind] || 'gray'
  const KindIcon = kind ? KIND_ICONS[kind] || LuPlay : LuPlay

  const content = (
    <HStack
      gap={3}
      p={2}
      bg={isLoaded ? 'bg.subtle' : 'bg.panel'}
      borderRadius="md"
      border="1px"
      borderColor={isLoaded ? 'green.800' : 'border.subtle'}
      _hover={{
        borderColor: isLoaded ? 'green.600' : 'purple.500',
        bg: 'bg.subtle',
      }}
      _active={{
        transform: isLoaded ? 'scale(0.98)' : 'none',
        bg: 'bg.subtle',
      }}
      transition="all 0.1s ease-out"
      cursor={isLoaded ? 'pointer' : 'default'}
    >
      {/* Постер миниатюра */}
      <Box w="40px" h="56px" flexShrink={0} borderRadius="sm" overflow="hidden" bg="bg.subtle">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={name || 'Аниме'}
            w="full"
            h="full"
            objectFit="cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Box w="full" h="full" display="flex" alignItems="center" justifyContent="center">
            <Icon as={KindIcon} boxSize={4} color="fg.subtle" />
          </Box>
        )}
      </Box>

      {/* Информация */}
      <VStack align="start" gap={0} flex={1} minW={0}>
        <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
          {name || `Аниме #${shikimoriId}`}
        </Text>
        <HStack gap={2}>
          <Badge size="sm" colorPalette={color} variant="subtle">
            {label}
          </Badge>
          {kind && (
            <Text fontSize="xs" color="fg.subtle" textTransform="uppercase">
              {kind}
            </Text>
          )}
          {year && (
            <Text fontSize="xs" color="fg.subtle">
              {year}
            </Text>
          )}
        </HStack>
      </VStack>

      {/* Статус / Действие */}
      <Box flexShrink={0}>
        {isLoaded ? (
          <Icon as={LuCheck} boxSize={5} color="green.400" />
        ) : (
          <Icon
            as={LuDownload}
            boxSize={5}
            color="fg.subtle"
            _hover={{ color: 'purple.400' }}
            cursor="pointer"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDownloadClick?.()
            }}
          />
        )}
      </Box>
    </HStack>
  )

  // Если загружено — клик открывает страницу аниме
  if (isLoaded && localAnimeId) {
    return (
      <Box onClick={() => router.push(`/library/${localAnimeId}`)} cursor="pointer">
        {content}
      </Box>
    )
  }

  return content
}

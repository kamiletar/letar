'use client'

import { Badge, Box, HStack, Image, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuDownload, LuFilm, LuPlay, LuTv } from 'react-icons/lu'

import { getRelationKindInfo } from '@letar/animatrona-utils'

import { useRouter } from 'next/navigation'

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
  // relationKind приходит из БД в UPPER_CASE — регистр нормализует сам геттер
  const relation = getRelationKindInfo(relationKind)
  const label = relation?.label ?? 'Связано'
  const color = relation?.colorPalette ?? 'gray'
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
        {posterUrl
          ? (
            <Image
              src={posterUrl}
              alt={name || 'Аниме'}
              w="full"
              h="full"
              objectFit="cover"
              loading="lazy"
              decoding="async"
            />
          )
          : (
            <Box w="full" h="full" display="flex" alignItems="center" justifyContent="center">
              <KindIcon size={16} color="var(--chakra-colors-fg-subtle)" />
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
        {isLoaded ? <LuCheck size={20} color="var(--chakra-colors-green-400)" /> : (
          <LuDownload
            size={20}
            color="var(--chakra-colors-fg-subtle)"
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

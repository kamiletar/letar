/**
 * Секция «Похожие аниме»
 *
 * Отображает аниме с пересечением жанров, отсортированные по релевантности.
 * Данные загружаются на сервере (page.tsx) и передаются как props.
 */

import { Badge, Box, HStack, Image, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuFilm } from 'react-icons/lu'

/** Похожее аниме (из БД) */
export interface SimilarAnimeItem {
  id: string
  title: string
  titleOriginal: string | null
  coverUrl: string | null
  year: number | null
  studio: string | null
  genres: string[]
  shikimoriId: number | null
  episodeCount: number
  /** Количество совпавших жанров с текущим аниме */
  matchingGenres: number
}

interface SimilarSectionProps {
  items: SimilarAnimeItem[]
  /** Жанры текущего аниме (для подсветки совпадений) */
  currentGenres: string[]
}

/** Карточка похожего аниме */
function SimilarCard({ item, currentGenres }: { item: SimilarAnimeItem; currentGenres: string[] }) {
  const slug = item.shikimoriId ?? item.id
  const coverUrl = item.coverUrl?.startsWith('ipfs://')
    ? item.coverUrl.replace('ipfs://', `${process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.letar.best'}/ipfs/`)
    : item.coverUrl || undefined

  return (
    <NextLink href={`/anime/${slug}`} style={{ textDecoration: 'none' }}>
      <HStack
        gap={3}
        bg="bg.subtle"
        px={3}
        py={3}
        borderRadius="md"
        border="1px"
        borderColor="border.subtle"
        cursor="pointer"
        transitionProperty="border-color, box-shadow"
        transitionDuration="0.15s"
        transitionTimingFunction="ease-out"
        _hover={{ borderColor: 'purple.500', shadow: 'md' }}
      >
        {/* Постер */}
        {coverUrl
          ? (
            <Image
              src={coverUrl}
              alt={item.title}
              w="48px"
              h="68px"
              objectFit="cover"
              borderRadius="sm"
              flexShrink={0}
            />
          )
          : <Box w="48px" h="68px" bg="bg.muted" borderRadius="sm" flexShrink={0} />}

        {/* Информация */}
        <VStack align="start" gap={1} flex={1} minW={0}>
          <Text fontSize="sm" fontWeight="medium" lineClamp={2}>
            {item.title}
          </Text>

          <HStack gap={1} flexWrap="wrap">
            {item.genres.slice(0, 3).map((g) => (
              <Badge
                key={g}
                size="sm"
                colorPalette={currentGenres.includes(g) ? 'purple' : 'gray'}
                variant={currentGenres.includes(g) ? 'subtle' : 'outline'}
              >
                {g}
              </Badge>
            ))}
          </HStack>

          <HStack gap={2}>
            {item.year && (
              <Text fontSize="xs" color="fg.subtle">
                {item.year}
              </Text>
            )}
            {item.studio && (
              <Text fontSize="xs" color="fg.subtle">
                {item.studio}
              </Text>
            )}
            {item.episodeCount > 0 && (
              <Text fontSize="xs" color="fg.subtle">
                {item.episodeCount} эп.
              </Text>
            )}
          </HStack>
        </VStack>
      </HStack>
    </NextLink>
  )
}

export function SimilarSection({ items, currentGenres }: SimilarSectionProps) {
  if (items.length === 0) {
    return (
      <Box py={8} textAlign="center">
        <Box as={LuFilm} mx="auto" mb={2} boxSize={8} color="fg.muted" />
        <Text color="fg.subtle">Похожие аниме не найдены</Text>
      </Box>
    )
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
      {items.map((item) => <SimilarCard key={item.id} item={item} currentGenres={currentGenres} />)}
    </SimpleGrid>
  )
}

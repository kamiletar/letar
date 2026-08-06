'use client'

/**
 * Read-only список связанных аниме из IPFS (RelationsDocument)
 *
 * Отображает карточки с постером, названием, годом, типом и бейджем связи.
 * Используется на странице каталога (discover), где данные БД недоступны.
 */

import { Badge, Box, Card, Heading, HStack, Icon, Image, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuLink2 } from 'react-icons/lu'

import { getGatewayBaseUrl } from '@/lib/media-url'
import type { AnimeManifestRelation } from '@letar/animatrona-types'

interface DiscoverRelatedListProps {
  /** Связанные аниме из RelationsDocument */
  relations: AnimeManifestRelation[]
}

/** Локализация типов связи */
const relationLabels: Record<string, { label: string; color: string }> = {
  sequel: { label: 'Сиквел', color: 'green' },
  prequel: { label: 'Приквел', color: 'blue' },
  side_story: { label: 'Побочная история', color: 'purple' },
  parent_story: { label: 'Основная история', color: 'orange' },
  summary: { label: 'Краткое содержание', color: 'gray' },
  full_story: { label: 'Полная версия', color: 'teal' },
  alternative_version: { label: 'Альтернативная версия', color: 'cyan' },
  alternative_setting: { label: 'Альтернативный сеттинг', color: 'cyan' },
  character: { label: 'Персонаж', color: 'pink' },
  other: { label: 'Другое', color: 'gray' },
  adaptation: { label: 'Адаптация', color: 'yellow' },
  SEQUEL: { label: 'Сиквел', color: 'green' },
  PREQUEL: { label: 'Приквел', color: 'blue' },
  SIDE_STORY: { label: 'Побочная история', color: 'purple' },
  PARENT_STORY: { label: 'Основная история', color: 'orange' },
  SUMMARY: { label: 'Краткое содержание', color: 'gray' },
  FULL_STORY: { label: 'Полная версия', color: 'teal' },
  ALTERNATIVE_VERSION: { label: 'Альтернативная версия', color: 'cyan' },
  ALTERNATIVE_SETTING: { label: 'Альтернативный сеттинг', color: 'cyan' },
  CHARACTER: { label: 'Персонаж', color: 'pink' },
  OTHER: { label: 'Другое', color: 'gray' },
  ADAPTATION: { label: 'Адаптация', color: 'yellow' },
}

/** Локализация типов аниме */
const kindLabels: Record<string, string> = {
  tv: 'TV',
  movie: 'Фильм',
  ova: 'OVA',
  ona: 'ONA',
  special: 'Спешл',
  music: 'Клип',
  TV: 'TV',
  MOVIE: 'Фильм',
  OVA: 'OVA',
  ONA: 'ONA',
  SPECIAL: 'Спешл',
  MUSIC: 'Клип',
}

/** Получить URL постера через gateway */
function getPosterUrl(posterUrl: string | undefined): string | null {
  if (!posterUrl) {
    return null
  }
  // Если уже HTTP URL — использовать как есть
  if (posterUrl.startsWith('http')) {
    return posterUrl
  }
  // ipfs://CID → gateway URL
  const cid = posterUrl.replace(/^ipfs:\/\//, '')
  return `${getGatewayBaseUrl()}/ipfs/${cid}`
}

/**
 * Read-only список связанных аниме
 */
export function DiscoverRelatedList({ relations }: DiscoverRelatedListProps) {
  if (relations.length === 0) {
    return null
  }

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Body>
        <VStack gap={4} align="stretch">
          <HStack>
            <Icon as={LuLink2} color="fg.muted" />
            <Heading size="md">Связанные аниме</Heading>
            <Badge colorPalette="gray" variant="subtle">
              {relations.length}
            </Badge>
          </HStack>

          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={3}>
            {relations.map((rel, index) => {
              const info = relationLabels[rel.relationKind] ?? { label: rel.relationKind, color: 'gray' }
              const posterUrl = getPosterUrl(rel.targetPosterUrl)
              const kindLabel = rel.targetKind ? (kindLabels[rel.targetKind] ?? rel.targetKind) : null

              return (
                <Card.Root
                  key={`${rel.targetShikimoriId}-${index}`}
                  bg="bg.subtle"
                  border="1px"
                  borderColor="border.subtle"
                  overflow="hidden"
                  cursor="pointer"
                  transition="all 0.15s ease-out"
                  _hover={{ borderColor: 'purple.500', transform: 'scale(1.02)' }}
                  onClick={() => {
                    // Открыть на Shikimori
                    window.open(`https://shikimori.one/animes/${rel.targetShikimoriId}`, '_blank')
                  }}
                >
                  {/* Постер */}
                  <Box position="relative" aspectRatio="2/3" bg="bg.subtle">
                    {posterUrl
                      ? <Image src={posterUrl} alt={rel.targetName ?? 'Постер'} objectFit="cover" w="100%" h="100%" />
                      : (
                        <Box w="100%" h="100%" display="flex" alignItems="center" justifyContent="center">
                          <Icon as={LuLink2} boxSize={8} color="fg.subtle" />
                        </Box>
                      )}

                    {/* Бейдж типа связи */}
                    <Badge position="absolute" top={1} left={1} colorPalette={info.color} size="sm" fontSize="2xs">
                      {info.label}
                    </Badge>
                  </Box>

                  <Card.Body py={2} px={2}>
                    <Text fontSize="xs" fontWeight="medium" lineClamp={2}>
                      {rel.targetName ?? `Аниме #${rel.targetShikimoriId}`}
                    </Text>
                    <HStack gap={1} mt={1}>
                      {rel.targetYear && (
                        <Text fontSize="2xs" color="fg.muted">
                          {rel.targetYear}
                        </Text>
                      )}
                      {kindLabel && (
                        <Badge size="sm" variant="subtle" fontSize="2xs">
                          {kindLabel}
                        </Badge>
                      )}
                    </HStack>
                  </Card.Body>
                </Card.Root>
              )
            })}
          </SimpleGrid>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

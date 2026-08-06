/**
 * Секция связанных аниме
 *
 * Отображает связи (SEQUEL, PREQUEL, SPIN_OFF, etc.) из RelationsDocument.
 * Группировка по типу связи, ссылки на трекер или Shikimori.
 * Адаптация из animatrona-web RelatedSection.
 */

import { Badge, Box, Heading, HStack, Image, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { AnimeManifestRelation } from '@letar/animatrona-types'
import Link from 'next/link'
import { LuExternalLink } from 'react-icons/lu'

/** Локализация типов связей */
const relationLabels: Record<string, { label: string; colorPalette: string }> = {
  sequel: { label: 'Сиквел', colorPalette: 'green' },
  prequel: { label: 'Приквел', colorPalette: 'blue' },
  side_story: { label: 'Побочная история', colorPalette: 'purple' },
  spin_off: { label: 'Спин-офф', colorPalette: 'orange' },
  summary: { label: 'Краткое содержание', colorPalette: 'gray' },
  full_story: { label: 'Полная история', colorPalette: 'cyan' },
  parent_story: { label: 'Основная история', colorPalette: 'teal' },
  alternative_setting: { label: 'Альт. сеттинг', colorPalette: 'yellow' },
  alternative_version: { label: 'Альт. версия', colorPalette: 'yellow' },
  other: { label: 'Другое', colorPalette: 'gray' },
}

/** Локализация типов аниме */
const kindLabels: Record<string, string> = {
  tv: 'TV',
  movie: 'Фильм',
  ova: 'OVA',
  ona: 'ONA',
  special: 'Спешл',
  music: 'Клип',
  tv_special: 'TV Спешл',
}

function getRelationInfo(kind: string): { label: string; colorPalette: string } {
  return relationLabels[kind.toLowerCase()] ?? relationLabels.other!
}

export interface RelatedSectionProps {
  relations: AnimeManifestRelation[]
  /** Маппинг shikimoriId → slug (shikimoriId или id) для ссылок внутри трекера */
  libraryMap?: Map<number, string>
}

/** Карточка связанного аниме */
function RelationCard({ relation, librarySlug }: { relation: AnimeManifestRelation; librarySlug?: string }) {
  const relationInfo = getRelationInfo(relation.relationKind)
  const kindLabel = relation.targetKind ? kindLabels[relation.targetKind.toLowerCase()] || relation.targetKind : null

  const cardContent = (
    <HStack
      gap={3}
      bg="bg.subtle"
      px={3}
      py={3}
      borderRadius="md"
      border="1px"
      borderColor="border.subtle"
      cursor="pointer"
      transition="all 0.15s ease-out"
      _hover={{ borderColor: 'purple.500', shadow: 'md' }}
    >
      {/* Постер */}
      {relation.targetPosterUrl
        ? (
          <Image
            src={relation.targetPosterUrl}
            alt={relation.targetName || ''}
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
        <HStack gap={1} flexWrap="wrap">
          <Badge colorPalette={relationInfo.colorPalette} size="sm">
            {relationInfo.label}
          </Badge>
          {kindLabel && (
            <Badge variant="subtle" size="sm">
              {kindLabel}
            </Badge>
          )}
        </HStack>
        <Text fontSize="sm" fontWeight="medium" lineClamp={2}>
          {relation.targetName || `Shikimori #${relation.targetShikimoriId}`}
        </Text>
        <HStack gap={2}>
          {relation.targetYear && (
            <Text fontSize="xs" color="fg.subtle">
              {relation.targetYear}
            </Text>
          )}
          {!librarySlug && (
            <HStack gap={1} color="fg.subtle">
              <LuExternalLink size={10} />
              <Text fontSize="xs">Shikimori</Text>
            </HStack>
          )}
        </HStack>
      </VStack>
    </HStack>
  )

  // Если аниме есть в трекере — ссылка внутрь
  if (librarySlug) {
    return (
      <Link href={`/anime/${librarySlug}`} style={{ textDecoration: 'none' }}>
        {cardContent}
      </Link>
    )
  }

  // Иначе — внешняя ссылка на Shikimori
  return (
    <a
      href={`https://shikimori.one/animes/${relation.targetShikimoriId}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none' }}
    >
      {cardContent}
    </a>
  )
}

/** Группировка связей по типу */
function groupRelations(relations: AnimeManifestRelation[]): Map<string, AnimeManifestRelation[]> {
  const groups = new Map<string, AnimeManifestRelation[]>()

  const order = [
    'sequel',
    'prequel',
    'side_story',
    'spin_off',
    'parent_story',
    'full_story',
    'summary',
    'alternative_setting',
    'alternative_version',
    'other',
  ]

  for (const rel of relations) {
    const kind = rel.relationKind.toLowerCase()
    const existing = groups.get(kind) || []
    existing.push(rel)
    groups.set(kind, existing)
  }

  // Сортируем по заданному порядку
  const sorted = new Map<string, AnimeManifestRelation[]>()
  for (const key of order) {
    if (groups.has(key)) {
      sorted.set(key, groups.get(key)!)
    }
  }
  for (const [key, value] of groups) {
    if (!sorted.has(key)) {
      sorted.set(key, value)
    }
  }

  return sorted
}

export function RelatedSection({ relations, libraryMap }: RelatedSectionProps) {
  if (!relations || relations.length === 0) {
    return (
      <Box py={8} textAlign="center">
        <Text color="fg.subtle">Связанные аниме не найдены</Text>
      </Box>
    )
  }

  const grouped = groupRelations(relations)

  return (
    <VStack gap={6} align="stretch">
      {Array.from(grouped.entries()).map(([kind, rels]) => {
        const info = getRelationInfo(kind)
        return (
          <Box key={kind}>
            <Heading size="sm" mb={3} color="fg.muted">
              {info.label} ({rels.length})
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              {rels.map((rel) => (
                <RelationCard
                  key={rel.targetShikimoriId}
                  relation={rel}
                  librarySlug={libraryMap?.get(rel.targetShikimoriId)}
                />
              ))}
            </SimpleGrid>
          </Box>
        )
      })}
    </VStack>
  )
}

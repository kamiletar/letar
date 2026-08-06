'use client'

/**
 * Секция метаданных: студии, персонал, персонажи, фандабберы
 *
 * Данные из AnimeManifest (IPFS).
 * Адаптация из animatrona-web MetadataSection.
 */

import { getIpfsUrl } from '@/lib/ipfs'
import { Badge, Box, Button, Flex, Heading, HStack, Image, SimpleGrid, Text, VStack, Wrap } from '@chakra-ui/react'
import type { AnimeManifestCharacter, AnimeManifestPerson, AnimeManifestStudio } from '@letar/animatrona-types'
import { useState } from 'react'
import { LuChevronDown, LuChevronUp } from 'react-icons/lu'

/** URL изображения: CID или legacy URL */
function getImageUrl(imageCid?: string | null, imageUrl?: string | null): string | null {
  if (imageCid) {
    return getIpfsUrl(imageCid)
  }
  return imageUrl ?? null
}

/** Ключевые роли персонала (показываем до 8) */
const KEY_ROLES = [
  'Director',
  'Original Creator',
  'Series Composition',
  'Music',
  'Character Design',
  'Animation Director',
  'Art Director',
  'Sound Director',
]

interface MetadataSectionProps {
  studios?: AnimeManifestStudio[]
  staff?: AnimeManifestPerson[]
  characters?: AnimeManifestCharacter[]
  fandubbers?: string[]
  fansubbers?: string[]
}

/** Секция студий */
function Studios({ studios }: { studios: AnimeManifestStudio[] }) {
  return (
    <Box>
      <Heading size="sm" mb={3} color="fg.muted">
        Студии
      </Heading>
      <HStack gap={3} flexWrap="wrap">
        {studios.map((studio) => {
          const logoUrl = getImageUrl(studio.imageCid, studio.imageUrl)
          return (
            <HStack key={studio.name} gap={2} bg="bg.subtle" px={3} py={2} borderRadius="md">
              {logoUrl && <Image src={logoUrl} alt={studio.name} h="24px" objectFit="contain" />}
              <Text fontSize="sm" fontWeight="medium">
                {studio.name}
              </Text>
            </HStack>
          )
        })}
      </HStack>
    </Box>
  )
}

/** Секция персонала */
function Staff({ staff }: { staff: AnimeManifestPerson[] }) {
  const sorted = [...staff].sort((a, b) => {
    const aIdx = KEY_ROLES.indexOf(a.role)
    const bIdx = KEY_ROLES.indexOf(b.role)
    if (aIdx >= 0 && bIdx >= 0) {
      return aIdx - bIdx
    }
    if (aIdx >= 0) {
      return -1
    }
    if (bIdx >= 0) {
      return 1
    }
    return 0
  })
  const visible = sorted.slice(0, 8)

  return (
    <Box>
      <Heading size="sm" mb={3} color="fg.muted">
        Персонал
      </Heading>
      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2}>
        {visible.map((person, i) => {
          const photoUrl = getImageUrl(person.imageCid, person.imageUrl)
          return (
            <HStack key={`${person.name}-${person.role}-${i}`} gap={2} bg="bg.subtle" px={3} py={2} borderRadius="md">
              {photoUrl && (
                <Image src={photoUrl} alt={person.name} boxSize="32px" objectFit="cover" borderRadius="full" />
              )}
              <VStack align="start" gap={0}>
                <Text fontSize="sm" fontWeight="medium">
                  {person.nameRu || person.name}
                </Text>
                <Text fontSize="xs" color="fg.subtle">
                  {person.role}
                </Text>
              </VStack>
            </HStack>
          )
        })}
      </SimpleGrid>
    </Box>
  )
}

/** Секция персонажей */
function Characters({ characters }: { characters: AnimeManifestCharacter[] }) {
  const [expanded, setExpanded] = useState(false)
  const INITIAL_COUNT = 6
  const visible = expanded ? characters : characters.slice(0, INITIAL_COUNT)
  const hasMore = characters.length > INITIAL_COUNT

  return (
    <Box>
      <Heading size="sm" mb={3} color="fg.muted">
        Персонажи
      </Heading>
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={2}>
        {visible.map((char, i) => {
          const photoUrl = getImageUrl(char.imageCid, char.imageUrl)
          return (
            <HStack key={`${char.name}-${i}`} gap={2} bg="bg.subtle" px={3} py={2} borderRadius="md">
              {photoUrl && <Image src={photoUrl} alt={char.name} boxSize="40px" objectFit="cover" borderRadius="md" />}
              <VStack align="start" gap={0} flex={1}>
                <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                  {char.nameRu || char.name}
                </Text>
                {char.role && (
                  <Text fontSize="xs" color="fg.subtle">
                    {char.role}
                  </Text>
                )}
                {char.voiceActor && (
                  <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                    CV: {char.voiceActor.nameRu || char.voiceActor.name}
                  </Text>
                )}
              </VStack>
            </HStack>
          )
        })}
      </SimpleGrid>
      {hasMore && (
        <Flex justify="center" mt={3}>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded
              ? (
                <>
                  <LuChevronUp /> Свернуть
                </>
              )
              : (
                <>
                  <LuChevronDown /> Ещё {characters.length - INITIAL_COUNT}
                </>
              )}
          </Button>
        </Flex>
      )}
    </Box>
  )
}

export function MetadataSection({ studios, staff, characters, fandubbers, fansubbers }: MetadataSectionProps) {
  const hasContent = (studios && studios.length > 0)
    || (staff && staff.length > 0)
    || (characters && characters.length > 0)
    || (fandubbers && fandubbers.length > 0)
    || (fansubbers && fansubbers.length > 0)

  if (!hasContent) {
    return null
  }

  return (
    <VStack gap={6} align="stretch">
      {studios && studios.length > 0 && <Studios studios={studios} />}
      {staff && staff.length > 0 && <Staff staff={staff} />}
      {characters && characters.length > 0 && <Characters characters={characters} />}
      {fandubbers && fandubbers.length > 0 && (
        <Box>
          <Heading size="sm" mb={2} color="fg.muted">
            Фандаббинг
          </Heading>
          <Wrap gap={2}>
            {fandubbers.map((name) => (
              <Badge key={name} variant="subtle" colorPalette="purple">
                {name}
              </Badge>
            ))}
          </Wrap>
        </Box>
      )}
      {fansubbers && fansubbers.length > 0 && (
        <Box>
          <Heading size="sm" mb={2} color="fg.muted">
            Фансаб
          </Heading>
          <Wrap gap={2}>
            {fansubbers.map((name) => (
              <Badge key={name} variant="subtle" colorPalette="blue">
                {name}
              </Badge>
            ))}
          </Wrap>
        </Box>
      )}
    </VStack>
  )
}

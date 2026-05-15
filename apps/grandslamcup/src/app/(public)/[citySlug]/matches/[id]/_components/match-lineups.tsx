/**
 * Составы двух команд — зеркальная раскладка.
 */

import { playerDisplayName } from '@/lib/player-utils'
import { Box, Circle, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import Link from 'next/link'
import { LuTrophy, LuUserRound } from 'react-icons/lu'

interface LineupPlayer {
  id: string
  player: { name: string; slug: string; photo: string | null; disambiguation?: string | null }
}

interface MatchLineupsProps {
  homeLineup: LineupPlayer[]
  awayLineup: LineupPlayer[]
  homeTeamName: string
  awayTeamName: string
  homeWins: boolean
  awayWins: boolean
  citySlug: string
  /** Состав домашней команды скрыт до -6ч (подан, но не показывается) */
  homeLineupHidden?: boolean
  /** Состав гостевой команды скрыт до -6ч (подан, но не показывается) */
  awayLineupHidden?: boolean
}

export function MatchLineups({
  homeLineup,
  awayLineup,
  homeTeamName,
  awayTeamName,
  homeWins,
  awayWins,
  citySlug,
  homeLineupHidden,
  awayLineupHidden,
}: MatchLineupsProps) {
  if (homeLineup.length === 0 && awayLineup.length === 0 && !homeLineupHidden && !awayLineupHidden) {
    return null
  }

  return (
    <SimpleGrid columns={2} gap={{ base: 3, md: 6 }}>
      {/* Домашняя команда — выравнивание вправо */}
      <Box>
        <HStack gap={2} mb={3} justify="flex-end">
          <Text fontWeight="bold" fontSize="sm" color={homeWins ? 'brand.solid' : 'fg.muted'}>
            {homeTeamName}
          </Text>
          {homeWins && <LuTrophy size={16} color="var(--chakra-colors-brand-solid)" />}
        </HStack>
        <VStack gap={1} align="stretch">
          {homeLineup.map((l) => (
            <Link key={l.id} href={`/${citySlug}/players/${l.player.slug}`}>
              <HStack
                gap={2}
                py={1.5}
                px={2}
                borderRadius="lg"
                _hover={{ bg: 'bg.subtle' }}
                transition="background 0.15s"
                flexDirection="row-reverse"
              >
                <PlayerAvatar photo={l.player.photo} name={l.player.name} />
                <Text fontSize="sm" textAlign="right" flex={1}>
                  {playerDisplayName(l.player)}
                </Text>
              </HStack>
            </Link>
          ))}
          {homeLineup.length === 0 && (
            <Text fontSize="sm" color="fg.subtle" textAlign="right">
              {homeLineupHidden ? 'Объявят за 6 часов до матча' : 'Состав не подан'}
            </Text>
          )}
        </VStack>
      </Box>

      {/* Гостевая команда — выравнивание влево */}
      <Box>
        <HStack gap={2} mb={3}>
          {awayWins && <LuTrophy size={16} color="var(--chakra-colors-brand-solid)" />}
          <Text fontWeight="bold" fontSize="sm" color={awayWins ? 'brand.solid' : 'fg.muted'}>
            {awayTeamName}
          </Text>
        </HStack>
        <VStack gap={1} align="stretch">
          {awayLineup.map((l) => (
            <Link key={l.id} href={`/${citySlug}/players/${l.player.slug}`}>
              <HStack
                gap={2}
                py={1.5}
                px={2}
                borderRadius="lg"
                _hover={{ bg: 'bg.subtle' }}
                transition="background 0.15s"
              >
                <PlayerAvatar photo={l.player.photo} name={l.player.name} />
                <Text fontSize="sm">{playerDisplayName(l.player)}</Text>
              </HStack>
            </Link>
          ))}
          {awayLineup.length === 0 && (
            <Text fontSize="sm" color="fg.subtle">
              {awayLineupHidden ? 'Объявят за 6 часов до матча' : 'Состав не подан'}
            </Text>
          )}
        </VStack>
      </Box>
    </SimpleGrid>
  )
}

function PlayerAvatar({ photo, name }: { photo: string | null; name: string }) {
  return (
    <Box w={7} h={7} borderRadius="md" overflow="hidden" flexShrink={0} position="relative">
      {photo ? (
        <Image src={`/api/files/${photo}`} alt={name} fill sizes="28px" style={{ objectFit: 'cover' }} />
      ) : (
        <Circle size={7} bg="bg.subtle" color="fg.muted">
          <LuUserRound size={14} />
        </Circle>
      )}
    </Box>
  )
}

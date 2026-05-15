/**
 * Timeline карьеры поэта — история команд.
 */

import { SectionHeading } from '@/app/_components/section-heading'
import { formatDateShort } from '@/lib/format-date'
import { getRoleLabel } from '@/lib/player-role-labels'
import { Badge, Box, Circle, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

interface TeamSeasonEntry {
  id: string
  leftAt: Date | null
  joinedAt: Date | null
  role: string
  isPlaying: boolean
  teamSeason: {
    team: { name: string; slug: string }
    season: { name: string }
    league: { name: string }
  }
}

interface PlayerCareerTimelineProps {
  teamSeasons: TeamSeasonEntry[]
  citySlug: string
}

export function PlayerCareerTimeline({ teamSeasons, citySlug }: PlayerCareerTimelineProps) {
  if (teamSeasons.length === 0) {
    return null
  }

  return (
    <Box>
      <SectionHeading mb={4}>{teamSeasons.length === 1 ? 'Команда' : 'Карьера'}</SectionHeading>
      <VStack align="stretch" gap={0} pl={4} position="relative">
        {/* Вертикальная линия */}
        <Box position="absolute" left="11px" top={2} bottom={2} w="2px" bg="brand.solid" opacity={0.3} />
        {teamSeasons.map((pts, i) => {
          const isActive = i === 0 && !pts.leftAt
          return (
            <Flex key={pts.id} gap={4} align="start" py={3} position="relative">
              <Circle
                size={5}
                bg={isActive ? 'brand.solid' : 'bg.subtle'}
                borderWidth="2px"
                borderColor="brand.solid"
                flexShrink={0}
                position="relative"
                left="-6px"
              />
              <VStack gap={1} align="start" flex={1}>
                <HStack gap={2} flexWrap="wrap">
                  <Text fontSize="xs" color="fg.muted">
                    {pts.teamSeason.season.name}
                  </Text>
                  <Badge colorPalette="gray" variant="subtle" size="xs">
                    {formatDateShort(pts.joinedAt)} — {pts.leftAt ? formatDateShort(pts.leftAt) : 'наст. время'}
                  </Badge>
                </HStack>
                <HStack gap={2} flexWrap="wrap">
                  <Link href={`/${citySlug}/teams/${pts.teamSeason.team.slug}`}>
                    <Text
                      fontWeight="semibold"
                      fontSize="sm"
                      _hover={{ color: 'brand.solid' }}
                      transition="color 0.15s"
                    >
                      {pts.teamSeason.team.name}
                    </Text>
                  </Link>
                  <Badge size="sm" colorPalette="blue" variant="subtle">
                    {pts.teamSeason.league.name}
                  </Badge>
                  <Badge size="sm" colorPalette={pts.role === 'PLAYER' ? 'gray' : 'purple'} variant="subtle">
                    {getRoleLabel(pts.role, pts.isPlaying)}
                  </Badge>
                </HStack>
              </VStack>
            </Flex>
          )
        })}
      </VStack>
    </Box>
  )
}

/**
 * Топ-3 лучших выступления поэта с медалями.
 */

import { SectionHeading } from '@/app/_components/section-heading'
import { formatDateShort } from '@/lib/format-date'
import { Box, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

import type { PlayerPerf } from '../_lib/compute-player-stats'

const MEDALS = ['🥇', '🥈', '🥉']

interface PlayerTopPerformancesProps {
  perfs: PlayerPerf[]
  citySlug: string
}

export function PlayerTopPerformances({ perfs, citySlug }: PlayerTopPerformancesProps) {
  const topPerfs = [...perfs].sort((a, b) => b.totalScore! - a.totalScore!).slice(0, 3)
  if (topPerfs.length === 0) {
    return null
  }

  return (
    <Box>
      <SectionHeading mb={3}>Лучшие выступления</SectionHeading>
      <VStack gap={2} align="stretch">
        {topPerfs.map((p, i) => (
          <Link key={p.id} href={`/${citySlug}/matches/${p.match.id}`}>
            <Flex
              bg="bg.panel"
              borderRadius="xl"
              p={4}
              borderWidth="1px"
              borderColor="border"
              justify="space-between"
              align="center"
              _hover={{ shadow: 'md', borderColor: 'border.emphasized', transform: 'translateY(-1px)' }}
              transition="all 0.2s"
            >
              <HStack gap={3}>
                <Text fontSize="lg">{MEDALS[i]}</Text>
                <VStack gap={0} align="start">
                  <Text fontSize="sm" fontWeight="medium">
                    {p.match.homeTeam.team.name} — {p.match.awayTeam.team.name}
                  </Text>
                  {p.match.scheduledAt && (
                    <Text fontSize="xs" color="fg.muted">
                      {formatDateShort(p.match.scheduledAt)}
                    </Text>
                  )}
                </VStack>
              </HStack>
              <HStack gap={3}>
                <Text fontSize="xs" color="fg.muted">
                  текст {p.textAdjusted} · подача {p.deliveryAdjusted}
                </Text>
                <Box
                  px={3}
                  py={1}
                  borderRadius="lg"
                  bg="brand.subtle"
                  fontWeight="bold"
                  fontSize="lg"
                  fontFamily="mono"
                  color="brand.solid"
                >
                  {p.totalScore}
                </Box>
              </HStack>
            </Flex>
          </Link>
        ))}
      </VStack>
    </Box>
  )
}

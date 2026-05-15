/**
 * Таблица всех выступлений поэта.
 */

import { DataTableWrapper } from '@/app/_components/data-table-wrapper'
import { SectionHeading } from '@/app/_components/section-heading'
import { formatDateShort } from '@/lib/format-date'
import { Box, Grid, HStack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { LuCalendarDays } from 'react-icons/lu'

import type { PlayerPerf } from '../_lib/compute-player-stats'

interface PlayerAllPerformancesProps {
  perfs: PlayerPerf[]
  citySlug: string
}

export function PlayerAllPerformances({ perfs, citySlug }: PlayerAllPerformancesProps) {
  if (perfs.length === 0) {
    return null
  }

  return (
    <Box>
      <SectionHeading mb={3}>Все выступления</SectionHeading>
      <DataTableWrapper>
        <Grid templateColumns="1fr 1fr 60px 60px 60px" gap={0} fontSize="sm" minW="400px">
          {['Дата', 'Матч', 'Текст', 'Подача', 'Итого'].map((h) => (
            <Box
              key={h}
              px={3}
              py={2}
              fontWeight="bold"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="wide"
              bg={{ base: 'gray.100', _dark: 'brand.950' }}
              color={{ base: 'fg.muted', _dark: 'gray.300' }}
              borderBottomWidth="2px"
              borderBottomColor="brand.solid"
            >
              {h}
            </Box>
          ))}
          {perfs.map((p, i) => (
            <Box key={p.id} display="contents">
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                fontSize="xs"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                <HStack gap={1} color="fg.muted">
                  <LuCalendarDays size={12} />
                  <Text>{formatDateShort(p.match.scheduledAt)}</Text>
                </HStack>
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                <Link href={`/${citySlug}/matches/${p.match.id}`}>
                  <Text fontSize="sm" _hover={{ color: 'brand.solid' }} lineClamp={1} transition="color 0.15s">
                    {p.match.homeTeam.team.name} — {p.match.awayTeam.team.name}
                  </Text>
                </Link>
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {p.textAdjusted ?? '—'}
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {p.deliveryAdjusted ?? '—'}
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                fontWeight="bold"
                fontFamily="mono"
                color="brand.solid"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {p.totalScore ?? '—'}
              </Box>
            </Box>
          ))}
        </Grid>
      </DataTableWrapper>
    </Box>
  )
}

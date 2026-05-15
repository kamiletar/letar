/**
 * Таблица результатов тайма (используется для 1-го и 2-го тайма).
 */

import { DataTableWrapper } from '@/app/_components/data-table-wrapper'
import { SectionHeading } from '@/app/_components/section-heading'
import { playerDisplayName } from '@/lib/player-utils'
import { Box, Grid, Text } from '@chakra-ui/react'
import Link from 'next/link'

interface Performance {
  id: string
  textAdjusted: number | null
  deliveryAdjusted: number | null
  totalScore: number | null
  player: { name: string; slug: string; disambiguation?: string | null }
  teamSeason: { id: string }
}

interface MatchHalfResultsProps {
  label: string
  perfs: Performance[]
  homeTeamId: string
  homeTeamName: string
  awayTeamName: string
  citySlug: string
}

export function MatchHalfResults({
  label,
  perfs,
  homeTeamId,
  homeTeamName,
  awayTeamName,
  citySlug,
}: MatchHalfResultsProps) {
  if (perfs.length === 0) {
    return null
  }

  return (
    <Box>
      <SectionHeading size="md" mb={3}>
        {label}
      </SectionHeading>
      <DataTableWrapper>
        <Grid templateColumns="40px 1fr 60px 60px 60px" gap={0} fontSize="sm" minW="400px">
          {['#', 'Поэт', 'Текст', 'Подача', 'Итого'].map((h) => (
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
          {perfs.map((p, i) => {
            const isHome = p.teamSeason.id === homeTeamId
            return (
              <Box key={p.id} display="contents">
                <Box
                  px={3}
                  py={2}
                  borderBottomWidth="1px"
                  borderBottomColor="border.muted"
                  bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                >
                  {i + 1}
                </Box>
                <Box
                  px={3}
                  py={2}
                  borderBottomWidth="1px"
                  borderBottomColor="border.muted"
                  bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                >
                  <Link href={`/${citySlug}/players/${p.player.slug}`}>
                    <Text _hover={{ color: 'brand.solid' }} transition="color 0.15s">
                      {playerDisplayName(p.player)}
                      <Text display="inline" fontSize="xs" color="fg.muted" ml={1}>
                        ({isHome ? homeTeamName : awayTeamName})
                      </Text>
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
            )
          })}
        </Grid>
      </DataTableWrapper>
    </Box>
  )
}

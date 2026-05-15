/**
 * Секция ближайших матчей города.
 * Серверный компонент — рендерит карточки запланированных матчей.
 */

import { MatchCard } from '@/app/_components/match-card'
import { SectionHeading } from '@/app/_components/section-heading'
import { Box, SimpleGrid } from '@chakra-ui/react'

/** Тип матча, полученного из Prisma include */
interface UpcomingMatch {
  id: string
  homeScore: number | null
  awayScore: number | null
  status: string
  scheduledAt: Date | null
  matchType: string
  homeTeam: { team: { name: string } }
  awayTeam: { team: { name: string } }
  venue: { name: string } | null
}

interface CityUpcomingMatchesProps {
  matches: UpcomingMatch[]
  citySlug: string
}

/** Ближайшие запланированные матчи */
export function CityUpcomingMatches({ matches, citySlug }: CityUpcomingMatchesProps) {
  if (matches.length === 0) return null

  return (
    <Box className="fade-in-up stagger-2">
      <SectionHeading mb={4}>Ближайшие матчи</SectionHeading>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
        {matches.map((m, i) => (
          <MatchCard
            key={m.id}
            id={m.id}
            homeTeamName={m.homeTeam.team.name}
            awayTeamName={m.awayTeam.team.name}
            homeScore={m.homeScore}
            awayScore={m.awayScore}
            status={m.status}
            scheduledAt={m.scheduledAt}
            venueName={m.venue?.name ?? null}
            citySlug={citySlug}
            featured={i === 0}
            matchType={m.matchType}
          />
        ))}
      </SimpleGrid>
    </Box>
  )
}

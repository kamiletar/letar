/**
 * Секция последних результатов города.
 * Серверный компонент — рендерит карточки завершённых матчей с кнопкой «Все матчи».
 */

import { MatchCard } from '@/app/_components/match-card'
import { SectionHeading } from '@/app/_components/section-heading'
import { Box, Button, Flex, SimpleGrid } from '@chakra-ui/react'
import Link from 'next/link'
import { LuArrowRight } from 'react-icons/lu'

/** Тип матча, полученного из Prisma include */
interface RecentMatch {
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

interface CityRecentResultsProps {
  matches: RecentMatch[]
  citySlug: string
}

/** Последние завершённые матчи */
export function CityRecentResults({ matches, citySlug }: CityRecentResultsProps) {
  if (matches.length === 0) { return null }

  return (
    <Box className="fade-in-up stagger-4">
      <SectionHeading mb={4}>Последние результаты</SectionHeading>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
        {matches.map((m) => (
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
            matchType={m.matchType}
          />
        ))}
      </SimpleGrid>
      <Flex justify="flex-end" mt={3}>
        <Link href={`/${citySlug}/schedule`}>
          <Button variant="ghost" size="sm" colorPalette="brand">
            Все матчи
            <LuArrowRight size={14} />
          </Button>
        </Link>
      </Flex>
    </Box>
  )
}

/**
 * Список матчей, на которых пользователь назначен счетоводом или ведущим.
 * Переиспользуется страницами /my/scorer-matches и /my/presenter-matches.
 *
 * Серверный компонент — принимает готовый список matches и путь для перехода (role).
 */

import { formatDateTimeFull } from '@/lib/format-date'
import { getDisplayStatus, matchStatusColors, matchStatusLabels } from '@/lib/match-status'
import { Badge, Box, Flex, Heading, Table, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuCalendarDays, LuMapPin } from 'react-icons/lu'

interface MatchItem {
  id: string
  status: string
  scheduledAt: Date | null
  homeScore: number
  awayScore: number
  scorerToken: string
  presenterToken: string
  homeTeam: { team: { name: string } }
  awayTeam: { team: { name: string } }
  venue: { name: string } | null
}

interface MyMatchesListProps {
  title: string
  emptyText: string
  matches: MatchItem[]
  /** Роль определяет куда вести ссылку: 'score' для счетовода, 'presenter' для ведущего */
  role: 'score' | 'presenter'
}

export function MyMatchesList({ title, emptyText, matches, role }: MyMatchesListProps) {
  if (matches.length === 0) {
    return (
      <VStack gap={4} align="stretch">
        <Heading size="lg">{title}</Heading>
        <Box bg="bg.panel" p={8} borderRadius="xl" textAlign="center" borderWidth="1px" borderColor="border.muted">
          <Text color="fg.muted">{emptyText}</Text>
        </Box>
      </VStack>
    )
  }

  // LIVE → SCHEDULED (ближайшие) → FINISHED (последние)
  const live = matches.filter((m) => m.status === 'LIVE')
  const upcoming = matches
    .filter((m) => m.status === 'SCHEDULED' || m.status === 'POSTPONED')
    .sort((a, b) => {
      const aTime = a.scheduledAt?.getTime() ?? Infinity
      const bTime = b.scheduledAt?.getTime() ?? Infinity
      return aTime - bTime
    })
  const finished = matches
    .filter((m) => m.status === 'FINISHED' || m.status === 'CANCELLED')
    .sort((a, b) => {
      const aTime = a.scheduledAt?.getTime() ?? 0
      const bTime = b.scheduledAt?.getTime() ?? 0
      return bTime - aTime
    })

  return (
    <VStack gap={6} align="stretch">
      <Heading size="lg">{title}</Heading>

      {live.length > 0 && <Section title="🔴 Сейчас идёт" matches={live} role={role} highlight />}

      {upcoming.length > 0 && <Section title="Предстоящие" matches={upcoming} role={role} />}

      {finished.length > 0 && <Section title="Прошедшие" matches={finished} role={role} />}
    </VStack>
  )
}

function Section({
  title,
  matches,
  role,
  highlight = false,
}: {
  title: string
  matches: MatchItem[]
  role: 'score' | 'presenter'
  highlight?: boolean
}) {
  return (
    <Box
      bg="bg.panel"
      borderRadius="xl"
      borderWidth="1px"
      borderColor={highlight ? 'red.muted' : 'border.muted'}
      overflow="hidden"
    >
      <Box p={4} borderBottomWidth="1px" borderColor="border.muted">
        <Heading size="md">{title}</Heading>
      </Box>
      <Box overflowX="auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Матч</Table.ColumnHeader>
              <Table.ColumnHeader>Дата</Table.ColumnHeader>
              <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Площадка</Table.ColumnHeader>
              <Table.ColumnHeader>Счёт</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {matches.map((match) => {
              const score =
                match.status === 'FINISHED' || match.status === 'LIVE'
                  ? `${match.homeScore} : ${match.awayScore}`
                  : '— : —'
              const displayStatus = getDisplayStatus(match)
              return (
                <Table.Row key={match.id} _hover={{ bg: 'bg.subtle', cursor: 'pointer' }}>
                  <Table.Cell>
                    <Link
                      href={`/match/${match.id}/${role}?token=${
                        role === 'score' ? match.scorerToken : match.presenterToken
                      }`}
                    >
                      <Text fontWeight="medium" _hover={{ color: 'brand.solid' }}>
                        {match.homeTeam.team.name} — {match.awayTeam.team.name}
                      </Text>
                    </Link>
                  </Table.Cell>
                  <Table.Cell fontSize="sm" color="fg.muted">
                    <Flex align="center" gap={1}>
                      <LuCalendarDays size={14} />
                      {match.scheduledAt ? formatDateTimeFull(match.scheduledAt) : '—'}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell display={{ base: 'none', md: 'table-cell' }} fontSize="sm" color="fg.muted">
                    {match.venue ? (
                      <Flex align="center" gap={1}>
                        <LuMapPin size={14} />
                        {match.venue.name}
                      </Flex>
                    ) : (
                      '—'
                    )}
                  </Table.Cell>
                  <Table.Cell fontWeight="bold" textAlign="center">
                    {score}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={matchStatusColors[displayStatus]} size="sm">
                      {matchStatusLabels[displayStatus]}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  )
}

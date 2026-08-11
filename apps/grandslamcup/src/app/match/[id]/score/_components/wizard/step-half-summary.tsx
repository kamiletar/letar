'use client'

/**
 * Шаг HALF_SUMMARY: итоги тайма.
 *
 * Крупный счёт команд, статистика участников (лучший балл, средний, текст vs подача).
 * Для 1-го тайма — кнопка «К перерыву».
 * Для 2-го тайма — кнопка «К финальным результатам» (переходит в FINAL_RESULTS).
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Table, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { finishHalfAction, nextRoundAction } from '../../_actions/scorer.action'
import type { MatchData } from '../scorer-client'

interface StepHalfSummaryProps {
  match: MatchData
  matchState: MatchSSEState | null
}

export function StepHalfSummary({ match, matchState }: StepHalfSummaryProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const half = matchState?.currentHalf ?? 1
  const isFirstHalf = half === 1

  // Перформансы только этого тайма с оценками
  const halfPerfs = match.performances.filter((p) => p.half === half && p.totalScore !== null)

  // Суммы по командам за этот тайм
  const homeHalfTotal = halfPerfs
    .filter((p) => p.teamSeasonId === match.homeTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const awayHalfTotal = halfPerfs
    .filter((p) => p.teamSeasonId === match.awayTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)

  // Накопленный счёт матча (все тайма)
  const allPerfs = match.performances.filter((p) => p.totalScore !== null)
  const homeTotalAll = allPerfs
    .filter((p) => p.teamSeasonId === match.homeTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const awayTotalAll = allPerfs
    .filter((p) => p.teamSeasonId === match.awayTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)

  // Статистика участников — топ по итоговому баллу
  const sortedByScore = [...halfPerfs].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))

  const handleContinue = useCallback(async () => {
    setPending(true)
    setError(null)
    if (isFirstHalf) {
      const res = await finishHalfAction(match.id)
      if (!res.success) {
        setError('Не удалось завершить тайм')
        setPending(false)
        return
      }
    } else {
      // 2-й тайм: сбрасываем фазу в IDLE → compute-wizard-step выберет FINAL_RESULTS
      const res = await nextRoundAction(match.id)
      if (!res.success) {
        setError('Не удалось продолжить')
        setPending(false)
        return
      }
    }
    setPending(false)
    router.refresh()
  }, [isFirstHalf, match.id, router])

  return (
    <VStack gap={5} align="stretch" py={4}>
      {/* Заголовок */}
      <Box textAlign="center">
        <Heading size="xl" mb={1}>
          Тайм {half} завершён
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {isFirstHalf ? 'Промежуточные результаты' : 'Финальные итоги тайма'}
        </Text>
      </Box>

      {/* Крупный счёт этого тайма */}
      <SimpleGrid columns={2} gap={3}>
        <TeamScoreCard
          name={match.homeTeam.name}
          halfScore={homeHalfTotal}
          totalScore={homeTotalAll}
          isLeading={homeHalfTotal > awayHalfTotal}
          label="Этот тайм"
        />
        <TeamScoreCard
          name={match.awayTeam.name}
          halfScore={awayHalfTotal}
          totalScore={awayTotalAll}
          isLeading={awayHalfTotal > homeHalfTotal}
          label="Этот тайм"
        />
      </SimpleGrid>

      {/* Если не 1-й тайм — показываем суммарный счёт матча */}
      {!isFirstHalf && (
        <Box p={4} borderRadius="xl" borderWidth="2px" borderColor="border.muted" bg="bg.subtle" textAlign="center">
          <Text fontSize="xs" color="fg.muted" mb={1}>
            Итоговый счёт матча
          </Text>
          <Heading size="3xl">
            <Text as="span" color={homeTotalAll >= awayTotalAll ? 'green.fg' : 'fg.muted'}>
              {homeTotalAll}
            </Text>
            <Text as="span" color="fg.muted" mx={2}>
              :
            </Text>
            <Text as="span" color={awayTotalAll >= homeTotalAll ? 'green.fg' : 'fg.muted'}>
              {awayTotalAll}
            </Text>
          </Heading>
          <Text fontSize="sm" color="fg.muted" mt={1}>
            {match.homeTeam.name} vs {match.awayTeam.name}
          </Text>
        </Box>
      )}

      {/* Статистика участников тайма */}
      {sortedByScore.length > 0 && (
        <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
          <Heading size="sm" mb={3}>
            📊 Статистика участников
          </Heading>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>#</Table.ColumnHeader>
                <Table.ColumnHeader>Поэт</Table.ColumnHeader>
                <Table.ColumnHeader>Команда</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">📜</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">🎭</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Итого</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortedByScore.map((p, idx) => {
                const isHome = p.teamSeasonId === match.homeTeam.id
                return (
                  <Table.Row key={p.id} bg={idx === 0 ? 'yellow.subtle' : undefined}>
                    <Table.Cell>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</Table.Cell>
                    <Table.Cell fontWeight={idx === 0 ? 'bold' : 'normal'}>{p.playerName}</Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={isHome ? 'blue' : 'orange'} size="sm" variant="subtle">
                        {isHome ? match.homeTeam.name : match.awayTeam.name}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <Badge size="sm" colorPalette="gray">
                        {p.textAdjusted ?? '—'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <Badge size="sm" colorPalette="gray">
                        {p.deliveryAdjusted ?? '—'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <Badge size="sm" colorPalette="blue">
                        {p.totalScore}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      {/* Средние показатели команд */}
      {halfPerfs.length > 0 && (
        <SimpleGrid columns={2} gap={3}>
          <TeamStatsBox
            teamName={match.homeTeam.name}
            perfs={halfPerfs.filter((p) => p.teamSeasonId === match.homeTeam.id)}
            palette="blue"
          />
          <TeamStatsBox
            teamName={match.awayTeam.name}
            perfs={halfPerfs.filter((p) => p.teamSeasonId === match.awayTeam.id)}
            palette="orange"
          />
        </SimpleGrid>
      )}

      {error && (
        <Text color="red.fg" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}

      <Button size="xl" colorPalette="green" onClick={handleContinue} loading={pending} py={7} fontSize="lg">
        {isFirstHalf ? '⏸ Начать перерыв' : '🏁 К финальным результатам'}
      </Button>
    </VStack>
  )
}

function TeamScoreCard({
  name,
  halfScore,
  totalScore,
  isLeading,
  label,
}: {
  name: string
  halfScore: number
  totalScore: number
  isLeading: boolean
  label: string
}) {
  return (
    <Box
      p={4}
      borderRadius="xl"
      borderWidth="2px"
      borderColor={isLeading ? 'green.solid' : 'border.muted'}
      bg={isLeading ? 'green.subtle' : 'bg.panel'}
      textAlign="center"
    >
      <Text fontSize="xs" color="fg.muted" lineClamp={1} mb={1}>
        {name}
      </Text>
      <Heading size="4xl" color={isLeading ? 'green.fg' : 'fg'}>
        {halfScore}
      </Heading>
      <Text fontSize="xs" color="fg.muted" mt={1}>
        {label}
      </Text>
      {isLeading && (
        <Badge colorPalette="green" size="sm" mt={1}>
          Лидирует
        </Badge>
      )}
    </Box>
  )
}

type PerfItem = MatchData['performances'][number]

function TeamStatsBox({ teamName, perfs, palette }: { teamName: string; perfs: PerfItem[]; palette: string }) {
  if (perfs.length === 0) { return null }
  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0)

  const totals = perfs.map((p) => p.totalScore ?? 0)
  const texts = perfs.map((p) => p.textAdjusted ?? 0)
  const deliveries = perfs.map((p) => p.deliveryAdjusted ?? 0)
  const best = Math.max(...totals)
  const worst = Math.min(...totals)

  return (
    <Box p={3} bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor={`${palette}.muted`}>
      <Text fontSize="xs" fontWeight="bold" color={`${palette}.fg`} mb={2} lineClamp={1}>
        {teamName}
      </Text>
      <VStack gap={1} align="stretch">
        <Flex justify="space-between">
          <Text fontSize="xs" color="fg.muted">
            Средний балл
          </Text>
          <Text fontSize="xs" fontWeight="bold">
            {avg(totals)}
          </Text>
        </Flex>
        <Flex justify="space-between">
          <Text fontSize="xs" color="fg.muted">
            📜 Средний текст
          </Text>
          <Text fontSize="xs">{avg(texts)}</Text>
        </Flex>
        <Flex justify="space-between">
          <Text fontSize="xs" color="fg.muted">
            🎭 Средняя подача
          </Text>
          <Text fontSize="xs">{avg(deliveries)}</Text>
        </Flex>
        <Flex justify="space-between">
          <Text fontSize="xs" color="fg.muted">
            Лучший
          </Text>
          <Badge colorPalette="green" size="sm">
            {best}
          </Badge>
        </Flex>
        <Flex justify="space-between">
          <Text fontSize="xs" color="fg.muted">
            Слабейший
          </Text>
          <Badge colorPalette="red" size="sm">
            {worst}
          </Badge>
        </Flex>
      </VStack>
    </Box>
  )
}

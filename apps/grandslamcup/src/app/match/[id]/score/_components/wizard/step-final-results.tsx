'use client'

/**
 * Шаг FINAL_RESULTS: финальная статистика матча.
 *
 * Показывается после завершения 2-го тайма, перед выбором победного стихотворения.
 * Крупный итоговый счёт, сравнение команд, топ-участники, средние и крайние значения.
 * Кнопка «Перейти к выбору победного стихотворения».
 */

import { Badge, Box, Button, Flex, Heading, SimpleGrid, Table, Text, VStack } from '@chakra-ui/react'
import type { MatchData } from '../scorer-client'

interface StepFinalResultsProps {
  match: MatchData
  onConfirm: () => void
}

export function StepFinalResults({ match, onConfirm }: StepFinalResultsProps) {
  const allPerfs = match.performances.filter((p) => p.totalScore !== null)

  const homePerfs = allPerfs.filter((p) => p.teamSeasonId === match.homeTeam.id)
  const awayPerfs = allPerfs.filter((p) => p.teamSeasonId === match.awayTeam.id)

  const homeTotal = homePerfs.reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const awayTotal = awayPerfs.reduce((s, p) => s + (p.totalScore ?? 0), 0)

  const isDraw = homeTotal === awayTotal
  const homeWins = homeTotal > awayTotal
  const winnerName = isDraw ? null : homeWins ? match.homeTeam.name : match.awayTeam.name

  const sortedAll = [...allPerfs].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))

  return (
    <VStack gap={5} align="stretch" py={4}>
      {/* Заголовок */}
      <Box textAlign="center">
        <Heading size="xl" mb={1}>
          {isDraw ? '🤝 Ничья' : `🏆 Победитель: ${winnerName}`}
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          Финальные результаты матча
        </Text>
      </Box>

      {/* Итоговый счёт — крупно */}
      <Box
        p={5}
        borderRadius="2xl"
        borderWidth="3px"
        borderColor={isDraw ? 'yellow.solid' : 'green.solid'}
        bg={isDraw ? 'yellow.subtle' : 'green.subtle'}
        textAlign="center"
      >
        <SimpleGrid columns={3} gap={2} alignItems="center">
          <Box textAlign="right">
            <Text fontSize="xs" color="fg.muted" lineClamp={1}>
              {match.homeTeam.name}
            </Text>
            <Heading size="4xl" color={homeWins ? 'green.fg' : isDraw ? 'fg' : 'fg.muted'}>
              {homeTotal}
            </Heading>
          </Box>
          <Box textAlign="center">
            <Text fontSize="2xl" color="fg.muted" fontWeight="bold">
              :
            </Text>
            {isDraw && (
              <Badge colorPalette="yellow" size="sm" mt={1}>
                Ничья
              </Badge>
            )}
          </Box>
          <Box textAlign="left">
            <Text fontSize="xs" color="fg.muted" lineClamp={1}>
              {match.awayTeam.name}
            </Text>
            <Heading size="4xl" color={!homeWins && !isDraw ? 'green.fg' : isDraw ? 'fg' : 'fg.muted'}>
              {awayTotal}
            </Heading>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Сравнение команд: тайм 1 vs тайм 2 */}
      <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
        <Heading size="sm" mb={3}>
          📈 По таймам
        </Heading>
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Тайм</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center">{match.homeTeam.name}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center">{match.awayTeam.name}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {[1, 2].map((half) => {
              const hp = match.performances.filter(
                (p) => p.half === half && p.teamSeasonId === match.homeTeam.id && p.totalScore !== null
              )
              const ap = match.performances.filter(
                (p) => p.half === half && p.teamSeasonId === match.awayTeam.id && p.totalScore !== null
              )
              const hs = hp.reduce((s, p) => s + (p.totalScore ?? 0), 0)
              const as_ = ap.reduce((s, p) => s + (p.totalScore ?? 0), 0)
              if (hp.length === 0 && ap.length === 0) return null
              return (
                <Table.Row key={half}>
                  <Table.Cell>Тайм {half}</Table.Cell>
                  <Table.Cell textAlign="center">
                    <Badge colorPalette={hs >= as_ ? 'blue' : 'gray'} size="sm">
                      {hs}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <Badge colorPalette={as_ >= hs ? 'orange' : 'gray'} size="sm">
                      {as_}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              )
            })}
            <Table.Row fontWeight="bold">
              <Table.Cell>Итого</Table.Cell>
              <Table.Cell textAlign="center">
                <Badge colorPalette={homeWins ? 'green' : 'gray'} size="md">
                  {homeTotal}
                </Badge>
              </Table.Cell>
              <Table.Cell textAlign="center">
                <Badge colorPalette={!homeWins && !isDraw ? 'green' : 'gray'} size="md">
                  {awayTotal}
                </Badge>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Box>

      {/* Топ участников матча */}
      {sortedAll.length > 0 && (
        <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
          <Heading size="sm" mb={3}>
            🏅 Топ участников матча
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
              {sortedAll.map((p, idx) => {
                const isHome = p.teamSeasonId === match.homeTeam.id
                return (
                  <Table.Row key={p.id} bg={idx === 0 ? 'yellow.subtle' : undefined}>
                    <Table.Cell>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</Table.Cell>
                    <Table.Cell fontWeight={idx < 3 ? 'bold' : 'normal'}>{p.playerName}</Table.Cell>
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

      {/* Командная статистика */}
      <SimpleGrid columns={2} gap={3}>
        <TeamStatsFull teamName={match.homeTeam.name} perfs={homePerfs} palette="blue" />
        <TeamStatsFull teamName={match.awayTeam.name} perfs={awayPerfs} palette="orange" />
      </SimpleGrid>

      <Button size="xl" colorPalette="yellow" onClick={onConfirm} py={7} fontSize="lg">
        {isDraw ? '🏁 Завершить матч' : '🏆 Выбрать поэта победного стихотворения'}
      </Button>
    </VStack>
  )
}

type PerfItem = MatchData['performances'][number]

function TeamStatsFull({ teamName, perfs, palette }: { teamName: string; perfs: PerfItem[]; palette: string }) {
  if (perfs.length === 0) return null

  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0)

  const totals = perfs.map((p) => p.totalScore ?? 0)
  const texts = perfs.map((p) => p.textAdjusted ?? 0)
  const deliveries = perfs.map((p) => p.deliveryAdjusted ?? 0)
  const best = perfs.reduce((b, p) => ((p.totalScore ?? 0) > (b.totalScore ?? 0) ? p : b), perfs[0])
  const worst = perfs.reduce((b, p) => ((p.totalScore ?? 0) < (b.totalScore ?? 0) ? p : b), perfs[0])

  return (
    <Box p={3} bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor={`${palette}.muted`}>
      <Text fontSize="sm" fontWeight="bold" color={`${palette}.fg`} mb={2} lineClamp={1}>
        {teamName}
      </Text>
      <VStack gap={1} align="stretch">
        <StatRow label="Сумма" value={String(totals.reduce((a, b) => a + b, 0))} bold />
        <StatRow label="Средний балл" value={String(avg(totals))} />
        <StatRow label="📜 Средний текст" value={String(avg(texts))} />
        <StatRow label="🎭 Средняя подача" value={String(avg(deliveries))} />
        <StatRow label="Лучший" value={`${best.playerName} (${best.totalScore})`} color="green.fg" />
        <StatRow label="Слабейший" value={`${worst.playerName} (${worst.totalScore})`} color="red.fg" />
        <StatRow label="Выступлений" value={String(perfs.length)} />
      </VStack>
    </Box>
  )
}

function StatRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <Flex justify="space-between" align="center" gap={2}>
      <Text fontSize="xs" color="fg.muted" flexShrink={0}>
        {label}
      </Text>
      <Text fontSize="xs" fontWeight={bold ? 'bold' : 'normal'} color={color ?? 'fg'} textAlign="right" lineClamp={1}>
        {value}
      </Text>
    </Flex>
  )
}

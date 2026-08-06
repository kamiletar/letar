/**
 * Таблица выступлений матча по таймам — оценки за текст/подачу, карточки, кнопки редактирования.
 * Серверный компонент.
 */

import { playerDisplayName } from '@/lib/player-utils'
import { Badge, Box, Heading, HStack, Table, Text } from '@chakra-ui/react'
import { EditScoresButton } from './edit-scores-button'
import { PlagiarismButton } from './plagiarism-button'

/** Тип выступления из Prisma include */
interface Performance {
  id: string
  playerId: string
  half: number
  roundNumber: number
  textAdjusted: number | null
  deliveryAdjusted: number | null
  totalScore: number | null
  textScores: number[]
  deliveryScores: number[]
  player: { id: string; name: string; slug: string; disambiguation: string | null }
  teamSeason: { team: { name: string } }
  cards: { id: string; type: string; reason: string | null }[]
}

export interface MatchPerformancesTableProps {
  performances: Performance[]
  /** ID дисквалифицированных за плагиат игроков */
  plagiarizedPlayerIds: Set<string>
}

export function MatchPerformancesTable({ performances, plagiarizedPlayerIds }: MatchPerformancesTableProps) {
  if (performances.length === 0) {
    return (
      <Box>
        <Heading size="md" mb={3}>
          Выступления
        </Heading>
        <Box bg="bg.panel" borderRadius="xl" p={6} textAlign="center">
          <Text color="fg.muted">Нет записанных выступлений</Text>
        </Box>
      </Box>
    )
  }

  const half1 = performances.filter((p) => p.half === 1)
  const half2 = performances.filter((p) => p.half === 2)

  const halves = [
    { label: '1 тайм', perfs: half1 },
    { label: '2 тайм', perfs: half2 },
  ].filter(({ perfs }) => perfs.length > 0)

  return (
    <>
      {halves.map(({ label, perfs }) => (
        <Box key={label}>
          <Heading size="md" mb={3}>
            {label}
          </Heading>
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
            <Box overflowX="auto">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader w="50px">#</Table.ColumnHeader>
                    <Table.ColumnHeader>Поэт</Table.ColumnHeader>
                    <Table.ColumnHeader>Команда</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center" w="60px">
                      Текст
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center" w="60px">
                      Подача
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center" w="60px">
                      Итого
                    </Table.ColumnHeader>
                    <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }} w="80px">
                      Карточки
                    </Table.ColumnHeader>
                    <Table.ColumnHeader w="40px" />
                    <Table.ColumnHeader w="100px" />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {perfs.map((perf) => {
                    const isPlagiarized = plagiarizedPlayerIds.has(perf.playerId)
                    return (
                      <Table.Row key={perf.id}>
                        <Table.Cell>
                          <Text fontFamily="mono" color="fg.muted">
                            {perf.roundNumber}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontWeight="medium">{playerDisplayName(perf.player)}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm" color="fg.muted">
                            {perf.teamSeason.team.name}
                          </Text>
                        </Table.Cell>
                        <Table.Cell textAlign="center">
                          <Text fontFamily="mono">{perf.textAdjusted ?? '—'}</Text>
                        </Table.Cell>
                        <Table.Cell textAlign="center">
                          <Text fontFamily="mono">{perf.deliveryAdjusted ?? '—'}</Text>
                        </Table.Cell>
                        <Table.Cell textAlign="center">
                          <Text fontWeight="bold" fontFamily="mono" color="brand.solid">
                            {perf.totalScore ?? '—'}
                          </Text>
                        </Table.Cell>
                        <Table.Cell display={{ base: 'none', md: 'table-cell' }}>
                          <HStack gap={1}>
                            {perf.cards.map((c) => (
                              <Badge key={c.id} colorPalette={c.type === 'RED' ? 'red' : 'yellow'} size="xs">
                                {c.type === 'RED' ? 'К' : 'Ж'}
                              </Badge>
                            ))}
                          </HStack>
                        </Table.Cell>
                        <Table.Cell>
                          <EditScoresButton
                            performanceId={perf.id}
                            currentTextScores={perf.textScores}
                            currentDeliveryScores={perf.deliveryScores}
                          />
                        </Table.Cell>
                        <Table.Cell>
                          {isPlagiarized
                            ? (
                              <Badge colorPalette="purple" variant="surface" size="sm">
                                Плагиат
                              </Badge>
                            )
                            : <PlagiarismButton performanceId={perf.id} playerName={playerDisplayName(perf.player)} />}
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        </Box>
      ))}
    </>
  )
}

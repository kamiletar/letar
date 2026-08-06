'use client'

/**
 * Превью пар следующего раунда швейцарки.
 * Показывает сгенерированные пары с W-L записями, кнопки подтверждения и перегенерации.
 */

import type { SwissTeamRecord } from '@/lib/swiss'
import { Badge, Box, Button, Dialog, Flex, Heading, HStack, Portal, Table, Text, VStack } from '@chakra-ui/react'
import { LuArrowLeftRight, LuCheck, LuDices, LuX } from 'react-icons/lu'

interface PreviewPair {
  home: SwissTeamRecord
  away: SwissTeamRecord
}

interface SwissRoundPreviewProps {
  roundNumber: number
  pairs: PreviewPair[]
  byes: SwissTeamRecord[]
  onConfirm: (pairs: Array<{ homeTeamSeasonId: string; awayTeamSeasonId: string }>) => void
  onRegenerate: () => void
  onClose: () => void
  confirming: boolean
  regenerating: boolean
}

function RecordBadge({ wins, losses }: { wins: number; losses: number }) {
  const color = wins > losses ? 'green' : wins < losses ? 'red' : 'gray'
  return (
    <Badge colorPalette={color} size="sm" variant="subtle">
      {wins}-{losses}
    </Badge>
  )
}

export function SwissRoundPreview({
  roundNumber,
  pairs,
  byes,
  onConfirm,
  onRegenerate,
  onClose,
  confirming,
  regenerating,
}: SwissRoundPreviewProps) {
  const handleConfirm = () => {
    onConfirm(
      pairs.map((p) => ({
        homeTeamSeasonId: p.home.teamSeasonId,
        awayTeamSeasonId: p.away.teamSeasonId,
      })),
    )
  }

  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW={{ base: 'calc(100vw - 32px)', sm: '2xl' }}>
            <Dialog.Header>
              <Dialog.Title>Тур {roundNumber} — Предварительные пары</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {/* Таблица пар */}
                <Box overflow="auto">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>#</Table.ColumnHeader>
                        <Table.ColumnHeader>Команда 1</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="center">W-L</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="center">
                          <LuArrowLeftRight size={14} />
                        </Table.ColumnHeader>
                        <Table.ColumnHeader>Команда 2</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="center">W-L</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {pairs.map((pair, i) => (
                        <Table.Row key={`${pair.home.teamSeasonId}-${pair.away.teamSeasonId}`}>
                          <Table.Cell color="fg.muted">{i + 1}</Table.Cell>
                          <Table.Cell fontWeight="medium">{pair.home.teamName}</Table.Cell>
                          <Table.Cell textAlign="center">
                            <RecordBadge wins={pair.home.wins} losses={pair.home.losses} />
                          </Table.Cell>
                          <Table.Cell textAlign="center">
                            <Text fontSize="xs" color="fg.muted">
                              vs
                            </Text>
                          </Table.Cell>
                          <Table.Cell fontWeight="medium">{pair.away.teamName}</Table.Cell>
                          <Table.Cell textAlign="center">
                            <RecordBadge wins={pair.away.wins} losses={pair.away.losses} />
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>

                {/* Bye-команды */}
                {byes.length > 0 && (
                  <Box>
                    <Heading size="sm" mb={1}>
                      Bye (проход без боя)
                    </Heading>
                    <HStack gap={2} flexWrap="wrap">
                      {byes.map((t) => (
                        <Badge key={t.teamSeasonId} colorPalette="yellow" size="sm">
                          {t.teamName} ({t.wins}-{t.losses})
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                {/* Итоги */}
                <Text fontSize="sm" color="fg.muted">
                  {pairs.length} матчей{byes.length > 0 ? `, ${byes.length} bye` : ''}
                </Text>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={2} w="100%" justify="space-between" flexWrap="wrap">
                <Button variant="outline" size="sm" onClick={onRegenerate} loading={regenerating} disabled={confirming}>
                  <LuDices size={14} />
                  Перетасовать
                </Button>
                <HStack gap={2}>
                  <Button variant="ghost" size="sm" onClick={onClose} disabled={confirming || regenerating}>
                    <LuX size={14} />
                    Отмена
                  </Button>
                  <Button
                    colorPalette="teal"
                    size="sm"
                    onClick={handleConfirm}
                    loading={confirming}
                    disabled={regenerating}
                  >
                    <LuCheck size={14} />
                    Подтвердить и создать
                  </Button>
                </HStack>
              </Flex>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

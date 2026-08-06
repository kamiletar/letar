'use client'

/**
 * Диалог выдачи карточки — выбор типа, причины и комментария.
 *
 * Chakra UI v3 compound-структура с Portal + Dialog.Positioner,
 * чтобы модал центрировался независимо от позиции триггера.
 */

import type { CardReason, CardType } from '@/generated/prisma'
import { Badge, Box, Button, Dialog, Flex, Input, Portal, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { issueCardAction } from '../_actions/scorer.action'

/** Причины карточек с описаниями */
const CARD_REASONS: Array<{ value: CardReason; label: string }> = [
  { value: 'OVERTIME', label: 'Превышение 3 минут' },
  { value: 'SINGING', label: 'Пение' },
  { value: 'PERFORMANCE', label: 'Недопустимое выступление' },
  { value: 'UNSANCTIONED_DISS', label: 'Несогласованный дисс' },
  { value: 'INSULT', label: 'Оскорбление' },
  { value: 'AGGRESSION', label: 'Агрессия' },
  { value: 'OTHER', label: 'Другое' },
]

interface CardDialogProps {
  matchId: string
  performanceId: string
  playerName: string
  onIssued?: () => void
}

export function CardDialog({ matchId, performanceId, playerName, onIssued }: CardDialogProps) {
  const [open, setOpen] = useState(false)
  const [cardType, setCardType] = useState<CardType>('YELLOW')
  const [reason, setReason] = useState<CardReason>('OTHER')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<
    {
      actualType: string
      upgradeToRed: boolean
      disqualifyTeam: boolean
      suspension: boolean
    } | null
  >(null)

  const handleIssue = useCallback(async () => {
    setLoading(true)
    const res = await issueCardAction(matchId, performanceId, cardType, reason, note || undefined)
    setLoading(false)

    if (res.success) {
      setResult({
        actualType: res.actualType!,
        upgradeToRed: res.upgradeToRed!,
        disqualifyTeam: res.disqualifyTeam!,
        suspension: res.suspension!,
      })
      // Закрываем через 2 секунды если нет предупреждений
      if (!res.upgradeToRed && !res.disqualifyTeam) {
        setTimeout(() => {
          setOpen(false)
          setResult(null)
          onIssued?.()
        }, 1500)
      }
    }
  }, [matchId, performanceId, cardType, reason, note, onIssued])

  const handleClose = () => {
    setOpen(false)
    setResult(null)
    setCardType('YELLOW')
    setReason('OTHER')
    setNote('')
    if (result) {
      onIssued?.()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => (e.open ? setOpen(true) : handleClose())}>
      <Dialog.Trigger asChild>
        <Button size="xs" colorPalette="yellow" variant="outline">
          🟨 Карточка
        </Button>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW={{ base: 'calc(100vw - 32px)', sm: 'md' }}>
            <Dialog.Header>
              <Dialog.Title>Карточка: {playerName}</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger />

            <Dialog.Body>
              {result
                ? (
                  /* Результат выдачи */
                  <VStack gap={3}>
                    <Badge
                      size="lg"
                      colorPalette={result.actualType === 'RED' ? 'red' : 'yellow'}
                      px={4}
                      py={2}
                      fontSize="lg"
                    >
                      {result.actualType === 'RED' ? '🟥 КРАСНАЯ' : '🟨 ЖЁЛТАЯ'}
                    </Badge>
                    {result.upgradeToRed && (
                      <Text color="red.fg" fontWeight="bold">
                        ⚠️ 2 жёлтых за матч = автоматическая красная!
                      </Text>
                    )}
                    {result.suspension && <Text color="red.fg">Игрок отстранён от следующих матчей</Text>}
                    {result.disqualifyTeam && (
                      <Text color="red.fg" fontWeight="bold" fontSize="lg">
                        🚫 КОМАНДА ДИСКВАЛИФИЦИРОВАНА (5 жёлтых за сезон)
                      </Text>
                    )}
                  </VStack>
                )
                : (
                  /* Форма выдачи */
                  <VStack gap={4} align="stretch">
                    {/* Тип карточки */}
                    <Box>
                      <Text fontWeight="medium" mb={2}>
                        Тип
                      </Text>
                      <Flex gap={2}>
                        <Button
                          flex={1}
                          size="lg"
                          colorPalette="yellow"
                          variant={cardType === 'YELLOW' ? 'solid' : 'outline'}
                          onClick={() => setCardType('YELLOW')}
                        >
                          🟨 Жёлтая
                        </Button>
                        <Button
                          flex={1}
                          size="lg"
                          colorPalette="red"
                          variant={cardType === 'RED' ? 'solid' : 'outline'}
                          onClick={() => setCardType('RED')}
                        >
                          🟥 Красная
                        </Button>
                      </Flex>
                    </Box>

                    {/* Причина */}
                    <Box>
                      <Text fontWeight="medium" mb={2}>
                        Причина
                      </Text>
                      <VStack gap={1} align="stretch">
                        {CARD_REASONS.map((r) => (
                          <Button
                            key={r.value}
                            size="sm"
                            variant={reason === r.value ? 'solid' : 'outline'}
                            colorPalette={reason === r.value ? 'blue' : 'gray'}
                            onClick={() => setReason(r.value)}
                            justifyContent="flex-start"
                          >
                            {r.label}
                          </Button>
                        ))}
                      </VStack>
                    </Box>

                    {/* Комментарий */}
                    <Box>
                      <Text fontWeight="medium" mb={2}>
                        Комментарий (необязательно)
                      </Text>
                      <Input
                        placeholder="Описание нарушения..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </Box>
                  </VStack>
                )}
            </Dialog.Body>

            {!result && (
              <Dialog.Footer>
                <Button variant="outline" onClick={handleClose}>
                  Отмена
                </Button>
                <Button colorPalette={cardType === 'RED' ? 'red' : 'yellow'} loading={loading} onClick={handleIssue}>
                  Выдать {cardType === 'RED' ? 'красную' : 'жёлтую'}
                </Button>
              </Dialog.Footer>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

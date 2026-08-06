'use client'

/**
 * Клиентский компонент формы заявки на матч.
 * Чекбоксы для выбора игроков (минимум 5, без верхнего лимита), валидация, отправка.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { submitMatchLineupAction } from '@/app/coach/_actions/coach.action'
import { formatDateTimeFull } from '@/lib/format-date'
import { Badge, Box, Button, Checkbox, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const ROLE_LABEL: Record<string, string> = {
  PLAYER: 'Игрок',
  COACH: 'Тренер',
  ASSISTANT_COACH: 'Зам',
}

const ROLE_COLOR: Record<string, string> = {
  PLAYER: 'blue',
  COACH: 'purple',
  ASSISTANT_COACH: 'teal',
}

const MIN_PLAYERS = 5

interface Player {
  id: string
  name: string
  role: string
}

interface LineupFormProps {
  matchId: string
  opponentName: string
  scheduledAt: string | null
  venueName: string | null
  matchStatus: string
  players: Player[]
  existingPlayerIds: string[]
  hoursUntilMatch: number | null
}

export function LineupForm({
  matchId,
  opponentName,
  scheduledAt,
  venueName,
  matchStatus,
  players,
  existingPlayerIds,
  hoursUntilMatch,
}: LineupFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Если заявка уже подана — предзаполняем чекбоксы
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(existingPlayerIds))

  const hasExistingLineup = existingPlayerIds.length > 0
  const isNotScheduled = matchStatus !== 'SCHEDULED'
  const isTooLate = hoursUntilMatch !== null && hoursUntilMatch < 6
  const isDisabled = isNotScheduled || isTooLate

  const selectedCount = selectedIds.size
  const canSubmit = !isDisabled && !isPending && selectedCount >= MIN_PLAYERS

  /** Переключение чекбокса игрока */
  function togglePlayer(playerId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
  }

  /** Отправка заявки */
  function handleSubmit() {
    startTransition(async () => {
      const result = await submitMatchLineupAction({
        matchId,
        playerIds: [...selectedIds],
      })

      if (result.error) {
        toaster.error({ title: String(result.error) })
        return
      }

      toaster.success({
        title: hasExistingLineup ? 'Заявка обновлена' : 'Заявка подана',
      })
      router.push('/coach/matches')
    })
  }

  // Форматирование даты
  const formattedDate = scheduledAt ? formatDateTimeFull(scheduledAt) : 'Дата не назначена'

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <Box>
        <Heading size="lg">Заявка на матч vs {opponentName}</Heading>
        <Flex gap={4} mt={2} wrap="wrap">
          <Text fontSize="sm" color="fg.muted">
            {formattedDate}
          </Text>
          {venueName && (
            <Text fontSize="sm" color="fg.muted">
              {venueName}
            </Text>
          )}
        </Flex>
      </Box>

      {/* Предупреждения */}
      {isNotScheduled && (
        <Box bg="red.subtle" borderWidth="1px" borderColor="red.muted" p={4} borderRadius="lg">
          <Text color="red.fg" fontWeight="medium">
            Матч уже начался или завершён. Изменение заявки невозможно.
          </Text>
        </Box>
      )}

      {!isNotScheduled && isTooLate && (
        <Box bg="orange.subtle" borderWidth="1px" borderColor="orange.muted" p={4} borderRadius="lg">
          <Text color="orange.fg" fontWeight="medium">
            До матча менее 6 часов. Подача/изменение заявки закрыты.
          </Text>
        </Box>
      )}

      {hasExistingLineup && !isNotScheduled && (
        <Box bg="blue.subtle" borderWidth="1px" borderColor="blue.muted" p={4} borderRadius="lg">
          <Text color="blue.fg" fontWeight="medium">
            Заявка уже подана ({existingPlayerIds.length} чел.).
            {!isTooLate && ' Вы можете изменить состав.'}
          </Text>
        </Box>
      )}

      {/* Счётчик выбранных */}
      <Flex
        justify="space-between"
        align="center"
        bg="bg.panel"
        p={4}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.muted"
      >
        <Text fontWeight="medium">Выбрано: {selectedCount}</Text>
        <Badge colorPalette={selectedCount < MIN_PLAYERS ? 'red' : 'green'} size="sm">
          {selectedCount < MIN_PLAYERS ? `Минимум ${MIN_PLAYERS}` : 'OK'}
        </Badge>
      </Flex>

      {/* Список игроков */}
      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
        {players.length === 0
          ? (
            <Box p={8} textAlign="center">
              <Text color="fg.muted">В команде нет активных игроков</Text>
            </Box>
          )
          : (
            <VStack gap={0} align="stretch">
              {players.map((player) => {
                const isChecked = selectedIds.has(player.id)
                const isMaxReached = false // без верхнего лимита

                return (
                  <Flex
                    key={player.id}
                    px={4}
                    py={3}
                    align="center"
                    gap={3}
                    borderBottomWidth="1px"
                    borderColor="border.muted"
                    _last={{ borderBottomWidth: 0 }}
                    cursor={isDisabled || isMaxReached ? 'default' : 'pointer'}
                    bg={isChecked ? 'blue.subtle' : 'transparent'}
                    _hover={!isDisabled && !isMaxReached ? { bg: isChecked ? 'blue.subtle' : 'bg.subtle' } : undefined}
                    onClick={() => {
                      if (!isDisabled && !isMaxReached) {
                        togglePlayer(player.id)
                      } else if (!isDisabled && isChecked) {
                        togglePlayer(player.id)
                      }
                    }}
                  >
                    <Checkbox.Root
                      checked={isChecked}
                      disabled={isDisabled || (isMaxReached && !isChecked)}
                      onCheckedChange={() => togglePlayer(player.id)}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                    <Text flex={1} fontWeight={isChecked ? 'medium' : 'normal'}>
                      {player.name}
                    </Text>
                    <Badge colorPalette={ROLE_COLOR[player.role] ?? 'gray'} size="sm">
                      {ROLE_LABEL[player.role] ?? player.role}
                    </Badge>
                  </Flex>
                )
              })}
            </VStack>
          )}
      </Box>

      {/* Кнопки */}
      <Flex gap={3} justify="flex-end">
        <Button asChild variant="ghost">
          <Link href="/coach/matches">Назад</Link>
        </Button>
        <Button colorPalette="blue" onClick={handleSubmit} disabled={!canSubmit} loading={isPending}>
          {hasExistingLineup ? 'Изменить заявку' : 'Подать заявку'}
        </Button>
      </Flex>
    </VStack>
  )
}

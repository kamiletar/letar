'use client'

/**
 * Диалог заявки состава счетоводом за команду (если тренер не пришёл).
 *
 * Открывается из scorer-client при нажатии «Заявить состав» на карточке команды.
 * Показывает roster команды — счетовод отмечает 5-8 игроков чекбоксами и сохраняет.
 * Использует submitScorerLineupAction (bypass coach access control).
 */

import { Box, Button, Checkbox, Dialog, Portal, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitScorerLineupAction } from '../_actions/scorer-lineup.action'

interface RosterPlayer {
  id: string
  name: string
  role: string
}

interface ScorerLineupDialogProps {
  matchId: string
  /** Публичный scorer token для доступа к action (вместо auth session) */
  scorerToken: string
  teamSeasonId: string
  teamName: string
  roster: RosterPlayer[]
  /** Текущие заявленные игроки — чтобы предзаполнить чекбоксы */
  currentLineup: string[]
  open: boolean
  onClose: () => void
}

const MIN_PLAYERS = 5
const MAX_PLAYERS = 8

export function ScorerLineupDialog({
  matchId,
  scorerToken,
  teamSeasonId,
  teamName,
  roster,
  currentLineup,
  open,
  onClose,
}: ScorerLineupDialogProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set(currentLineup))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (playerId: string) => {
    const next = new Set(selected)
    if (next.has(playerId)) {
      next.delete(playerId)
    } else {
      if (next.size >= MAX_PLAYERS) {
        setError(`Максимум ${MAX_PLAYERS} игроков`)
        return
      }
      next.add(playerId)
    }
    setSelected(next)
    setError(null)
  }

  const handleSave = async () => {
    if (selected.size < MIN_PLAYERS) {
      setError(`Минимум ${MIN_PLAYERS} игроков`)
      return
    }
    setSaving(true)
    setError(null)
    const res = await submitScorerLineupAction({
      matchId,
      scorerToken,
      teamSeasonId,
      playerIds: Array.from(selected),
    })
    setSaving(false)
    if (!res.success) {
      setError(res.error ?? 'Не удалось сохранить заявку')
      return
    }
    onClose()
    router.refresh()
  }

  const handleClose = () => {
    setSelected(new Set(currentLineup))
    setError(null)
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => (!e.open ? handleClose() : undefined)}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW={{ base: 'calc(100vw - 32px)', sm: 'md' }}>
            <Dialog.Header>
              <Dialog.Title>Заявка состава: {teamName}</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <VStack gap={3} align="stretch">
                <Text fontSize="sm" color="fg.muted">
                  Выберите от {MIN_PLAYERS} до {MAX_PLAYERS} игроков. Выбрано: {selected.size}
                </Text>
                {error && (
                  <Text fontSize="sm" color="red.fg">
                    {error}
                  </Text>
                )}
                {roster.length === 0
                  ? (
                    <Text fontSize="sm" color="fg.muted">
                      У команды нет активного состава. Обратитесь к организатору.
                    </Text>
                  )
                  : (
                    <VStack gap={2} align="stretch">
                      {roster.map((player) => {
                        const isCoachRole = player.role === 'COACH' || player.role === 'ASSISTANT_COACH'
                        const isSelected = selected.has(player.id)
                        return (
                          <Box
                            key={player.id}
                            onClick={() => toggle(player.id)}
                            p={2}
                            borderWidth="1px"
                            borderColor={isSelected ? 'blue.solid' : 'border.muted'}
                            borderRadius="md"
                            bg={isSelected ? 'blue.subtle' : 'bg.panel'}
                            cursor="pointer"
                            _hover={{ borderColor: 'blue.muted' }}
                            display="flex"
                            alignItems="center"
                            gap={2}
                          >
                            {
                              /* Box больше не <label> — строка целиком кликабельна через onClick={toggle}.
                              У Checkbox.Root свой onCheckedChange={toggle}: без stopPropagation клик по самому
                              чекбоксу всплыл бы до Box и вызвал toggle дважды (двойной тоггл, как в антипаттерне
                              из .claude/rules/components.md). stopPropagation на Checkbox.Root это исключает —
                              клик обрабатывается ровно одним обработчиком, независимо где кликнули внутри строки. */
                            }
                            <Checkbox.Root
                              checked={isSelected}
                              onCheckedChange={() => toggle(player.id)}
                              onClick={(e) => e.stopPropagation()}
                              variant="solid"
                            >
                              <Checkbox.HiddenInput />
                              <Checkbox.Control />
                            </Checkbox.Root>
                            <Text fontSize="sm" flex={1}>
                              {player.name}
                              {isCoachRole && (
                                <Text as="span" fontSize="xs" color="fg.muted" ml={2}>
                                  ({player.role === 'COACH' ? 'тренер' : 'зам. тренера'})
                                </Text>
                              )}
                            </Text>
                          </Box>
                        )
                      })}
                    </VStack>
                  )}
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                colorPalette="blue"
                loading={saving}
                disabled={selected.size < MIN_PLAYERS || roster.length === 0}
                onClick={handleSave}
              >
                Сохранить ({selected.size}/{MAX_PLAYERS})
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

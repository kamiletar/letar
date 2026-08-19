'use client'

/**
 * Шаг 3: Жеребьёвка первого тайма.
 *
 * Счетовод жмёт «Жеребьёвка» — случайно выбирается команда. Или выбирает вручную.
 * После сохранения result в БД wizard автоматически переходит к шагу 4.
 */

import { Box, Button, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { LuCheck, LuDices } from 'react-icons/lu'
import { setFirstHalfStartTeamAction } from '../../_actions/scorer.action'
import type { MatchData } from '../scorer-client'

interface StepCoinFlipProps {
  match: MatchData
}

export function StepCoinFlip({ match }: StepCoinFlipProps) {
  const router = useRouter()
  const [flipping, setFlipping] = useState(false)
  const [saving, setSaving] = useState(false)
  /** Выбранная команда — ещё не сохранена в БД, ждёт подтверждения */
  const [pendingChoice, setPendingChoice] = useState<'HOME' | 'AWAY' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFlip = useCallback(async () => {
    setError(null)
    setPendingChoice(null)
    setFlipping(true)
    // Небольшая анимация — 1 сек «вращения»
    await new Promise((r) => setTimeout(r, 1000))
    const side: 'HOME' | 'AWAY' = Math.random() < 0.5 ? 'HOME' : 'AWAY'
    setPendingChoice(side)
    setFlipping(false)
  }, [])

  const handleManual = useCallback((side: 'HOME' | 'AWAY') => {
    setError(null)
    setPendingChoice(side)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!pendingChoice) { return }
    setError(null)
    setSaving(true)
    const res = await setFirstHalfStartTeamAction(match.id, pendingChoice)
    setSaving(false)
    if (!res.success) {
      setError(res.error ?? 'Не удалось сохранить результат')
      return
    }
    // Refresh страницы — перезагрузит match.firstHalfStartTeam из SSR props
    // и computeWizardStep переключит wizard на PERFORMER_PICK
    router.refresh()
  }, [match.id, pendingChoice, router])

  return (
    <VStack gap={6} align="stretch" py={8}>
      <Box textAlign="center">
        <Heading size="xl" mb={2}>
          🎲 Жеребьёвка
        </Heading>
        <Text color="fg.muted">Кто начинает первый тайм?</Text>
      </Box>

      <SimpleGrid columns={2} gap={4}>
        <TeamCard
          name={match.homeTeam.name}
          label={match.useHomeAway ? 'Дома' : null}
          selected={pendingChoice === 'HOME'}
          animating={flipping}
          onClick={() => handleManual('HOME')}
          disabled={saving || flipping}
        />
        <TeamCard
          name={match.awayTeam.name}
          label={match.useHomeAway ? 'В гостях' : null}
          selected={pendingChoice === 'AWAY'}
          animating={flipping}
          onClick={() => handleManual('AWAY')}
          disabled={saving || flipping}
        />
      </SimpleGrid>

      {error && (
        <Text color="red.fg" textAlign="center" fontSize="sm">
          {error}
        </Text>
      )}

      <Button
        size="xl"
        colorPalette="purple"
        onClick={handleFlip}
        loading={flipping}
        disabled={saving}
        py={8}
        fontSize="xl"
        fontWeight="bold"
      >
        <LuDices /> Провести жеребьёвку
      </Button>

      {pendingChoice && !flipping && (
        <VStack gap={3} bg="green.subtle" p={4} borderRadius="xl" align="stretch">
          <Text fontSize="lg" fontWeight="bold" color="green.fg" textAlign="center">
            Начинает: {pendingChoice === 'HOME' ? match.homeTeam.name : match.awayTeam.name}
          </Text>
          <HStack gap={3}>
            <Button flex={1} variant="outline" onClick={() => setPendingChoice(null)} disabled={saving}>
              Отменить
            </Button>
            <Button flex={2} size="lg" colorPalette="green" onClick={handleConfirm} loading={saving} fontWeight="bold">
              <LuCheck /> Подтвердить
            </Button>
          </HStack>
          <Text fontSize="xs" color="fg.muted" textAlign="center">
            Нажмите подтвердить, чтобы зафиксировать жеребьёвку и перейти к выбору поэта
          </Text>
        </VStack>
      )}
    </VStack>
  )
}

function TeamCard({
  name,
  label,
  selected,
  animating,
  onClick,
  disabled,
}: {
  name: string
  /** null скрывает лейбл (для городов без home/away, напр. Москва) */
  label: string | null
  selected: boolean
  animating: boolean
  onClick: () => void
  disabled: boolean
}) {
  return (
    <Box
      p={6}
      borderRadius="xl"
      borderWidth="3px"
      borderColor={selected ? 'green.solid' : 'border.muted'}
      bg={selected ? 'green.subtle' : 'bg.panel'}
      cursor={disabled ? 'default' : 'pointer'}
      onClick={disabled ? undefined : onClick}
      transitionProperty="border-color, background-color, transform"
      transitionDuration="0.5s"
      transform={animating ? 'rotate(5deg)' : 'none'}
      textAlign="center"
      minH="120px"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      _hover={disabled ? {} : { borderColor: 'blue.muted', bg: 'bg.subtle' }}
    >
      {label && (
        <Text fontSize="xs" color="fg.muted" mb={1} textTransform="uppercase">
          {label}
        </Text>
      )}
      <Text fontSize="xl" fontWeight="bold" lineClamp={2}>
        {name}
      </Text>
    </Box>
  )
}

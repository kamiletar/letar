'use client'

/**
 * Шаг 9: Перерыв между таймами.
 *
 * Напоминает что на проекторе показываются спонсоры/донаты.
 * Кнопка «Начать 2-й тайм» сбрасывает жюри и переводит к шагу SELECT_JURY
 * (через createJuryInviteAction для половины 2).
 */

import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuPlay } from 'react-icons/lu'
import { createJuryInviteAction } from '../../_actions/scorer.action'
import type { MatchData } from '../scorer-client'

interface StepIntermissionProps {
  match: MatchData
}

export function StepIntermission({ match }: StepIntermissionProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startTs] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)

  // Счётчик прошедшего времени перерыва
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTs) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTs])

  const handleStart = useCallback(async () => {
    setPending(true)
    setError(null)
    // Создаём новый инвайт для 2-го тайма, SSE-обновление переведёт wizard на SELECT_JURY
    const res = await createJuryInviteAction(match.id, 2)
    setPending(false)
    if (!res.success) {
      setError('Не удалось начать 2-й тайм')
      return
    }
    router.refresh()
  }, [match.id, router])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <VStack gap={6} align="stretch" py={12}>
      <Box textAlign="center">
        <Heading size="4xl" mb={4}>
          ⏸ Перерыв
        </Heading>
        <Text fontSize="xl" color="fg.muted">
          Пока на проекторе зрители видят спонсоров и могут оставить донат.
        </Text>
      </Box>

      <Box textAlign="center">
        <Text fontSize="6xl" fontFamily="mono" fontWeight="bold" color="blue.fg">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          Прошло с начала перерыва
        </Text>
      </Box>

      {error && (
        <Text color="red.fg" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}

      <Button size="2xl" colorPalette="green" onClick={handleStart} loading={pending} py={10} fontSize="2xl">
        <LuPlay /> Начать 2-й тайм
      </Button>

      <Text fontSize="xs" color="fg.muted" textAlign="center">
        После нажатия появится QR для регистрации новых судей на 2-й тайм.
      </Text>
    </VStack>
  )
}

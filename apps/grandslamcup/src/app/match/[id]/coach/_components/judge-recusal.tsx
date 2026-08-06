'use client'

/**
 * Компонент отвода судьи по цвету.
 *
 * Тренер видит судей с цветными бейджами и может запросить отвод:
 * "Отвести Красного!" вместо "Отвести №3".
 */

import { toaster } from '@/app/_components/ui/toaster'
import { JUDGE_COLORS, type JudgeColor } from '@/lib/judge-colors'
import { Badge, Box, Button, Circle, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuShieldOff } from 'react-icons/lu'
import { requestJudgeRecusalAction } from '../_actions/coach-match.action'

interface Judge {
  sessionId: string
  name: string
  judgeNumber: number
  /** null для ручных слотов — их нельзя отвести через интерфейс тренера */
  color: JudgeColor | null
}

interface JudgeRecusalProps {
  matchId: string
  coachToken: string
  judges: Judge[]
  /** Разрешён ли отвод ведущим */
  allowed: boolean
}

export function JudgeRecusal({ matchId, coachToken, judges, allowed }: JudgeRecusalProps) {
  const [requesting, setRequesting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  if (!allowed || judges.length === 0) {
    return null
  }

  const handleRecusal = async (color: JudgeColor) => {
    setRequesting(color)
    try {
      const result = await requestJudgeRecusalAction(matchId, coachToken, color)
      if (!result.success) {
        toaster.error({ title: result.error ?? 'Ошибка' })
      } else {
        const colorConfig = JUDGE_COLORS[color]
        toaster.success({
          title: `Запрос на отвод ${colorConfig.name} отправлен`,
          description: 'Ожидайте решения ведущего',
        })
        setExpanded(false)
      }
    } finally {
      setRequesting(null)
    }
  }

  if (!expanded) {
    return (
      <Button variant="outline" size="sm" colorPalette="orange" onClick={() => setExpanded(true)}>
        <LuShieldOff size={14} />
        Отвод судьи
      </Button>
    )
  }

  return (
    <Box bg="orange.subtle" borderWidth="1px" borderColor="orange.muted" borderRadius="lg" p={3}>
      <Flex justify="space-between" align="center" mb={2}>
        <HStack gap={2}>
          <LuShieldOff size={14} />
          <Text fontSize="sm" fontWeight="bold">
            Отвод судьи
          </Text>
        </HStack>
        <Button variant="ghost" size="xs" onClick={() => setExpanded(false)}>
          Отмена
        </Button>
      </Flex>
      <VStack gap={2} align="stretch">
        {
          /* Отводить можно только судей с цветом (зарегистрированных через QR).
            Ручные слоты отводу не подлежат — ими управляет счётовод напрямую. */
        }
        {judges
          .filter((j): j is typeof j & { color: NonNullable<typeof j.color> } => j.color !== null)
          .map((judge) => {
            const colorConfig = JUDGE_COLORS[judge.color]
            return (
              <Flex key={judge.sessionId} align="center" justify="space-between" p={2} bg="bg.subtle" borderRadius="md">
                <HStack gap={2}>
                  <Circle size="20px" bg={colorConfig.hex} />
                  <Badge colorPalette={colorConfig.chakra} size="sm">
                    {colorConfig.name}
                  </Badge>
                  <Text fontSize="sm">{judge.name}</Text>
                </HStack>
                <Button
                  size="xs"
                  colorPalette="orange"
                  onClick={() =>
                    handleRecusal(judge.color)}
                  loading={requesting === judge.color}
                  disabled={requesting !== null}
                >
                  Отвести {colorConfig.nameGenitive}!
                </Button>
              </Flex>
            )
          })}
      </VStack>
    </Box>
  )
}

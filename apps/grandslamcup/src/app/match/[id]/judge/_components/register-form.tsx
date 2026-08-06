'use client'

/**
 * Форма регистрации судьи — ввод имени
 */

import type { JudgeColor } from '@/lib/judge-colors'
import { Button, Heading, Input, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { registerJudgeAction } from '../_actions/judge.action'

interface RegisterFormProps {
  matchId: string
  half: number
  inviteKey: string
  onRegistered: (
    name: string,
    judgeNumber: number,
    color?: JudgeColor | null,
    isQueued?: boolean,
    queuePosition?: number,
  ) => void
}

export function RegisterForm({ matchId, half, inviteKey, onRegistered }: RegisterFormProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Введите ваше имя')
      return
    }
    if (trimmed.length < 2) {
      setError('Имя должно быть не менее 2 символов')
      return
    }

    setLoading(true)
    setError(null)

    const result = await registerJudgeAction(matchId, half, inviteKey, trimmed)
    setLoading(false)

    if (result.success && 'judgeNumber' in result && typeof result.judgeNumber === 'number') {
      onRegistered(
        trimmed,
        result.judgeNumber,
        result.color as JudgeColor | null | undefined,
        result.isQueued as boolean | undefined,
        result.queuePosition as number | undefined,
      )
    } else if (!result.success) {
      setError(result.error ?? 'Ошибка регистрации')
    }
  }, [matchId, half, inviteKey, name, onRegistered])

  return (
    <VStack gap={4} w="full">
      <Heading size="xl" textAlign="center">
        Судья
      </Heading>
      <Text textAlign="center" color="fg.muted">
        Введите ваше имя для регистрации в жюри
      </Text>

      <Input
        placeholder="Ваше имя"
        size="lg"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        autoFocus
      />

      {error && (
        <Text color="red.500" fontSize="sm">
          {error}
        </Text>
      )}

      <Button colorPalette="blue" size="lg" width="full" loading={loading} onClick={handleSubmit}>
        Подключиться
      </Button>
    </VStack>
  )
}

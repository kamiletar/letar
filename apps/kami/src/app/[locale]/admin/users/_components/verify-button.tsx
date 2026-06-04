'use client'

import { Button } from '@chakra-ui/react'
import { useState } from 'react'
import { verifyUserAction } from '../_actions/verify-user.action'

interface VerifyButtonProps {
  userId: string
  emailVerified: boolean
}

/**
 * Кнопка ручной верификации / снятия верификации email
 */
export function VerifyButton({ userId, emailVerified: initial }: VerifyButtonProps) {
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(initial)

  async function handleToggle() {
    setLoading(true)
    const result = await verifyUserAction(userId, !verified)
    if (result.success && result.emailVerified !== undefined) {
      setVerified(result.emailVerified)
    }
    setLoading(false)
  }

  return (
    <Button
      size="xs"
      variant={verified ? 'solid' : 'outline'}
      colorPalette={verified ? 'green' : 'orange'}
      onClick={handleToggle}
      loading={loading}
      title={verified ? 'Снять верификацию' : 'Верифицировать вручную'}
    >
      {verified ? 'Верифицирован' : 'Не верифицирован'}
    </Button>
  )
}

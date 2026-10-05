'use client'

import { signInWithLetarAuth } from '@/lib/auth-client'
import { Button } from '@chakra-ui/react'

export function LoginButton() {
  return (
    <Button colorPalette="teal" size="lg" onClick={() => signInWithLetarAuth()}>
      Войти через Ключницу
    </Button>
  )
}

'use client'

import { Button } from '@/app/_components/ui/button'
import { signInWithLetarAuth } from '@/lib/auth-client'
import { Text } from '@chakra-ui/react'
import { LogIn } from 'lucide-react'
import { useState } from 'react'

interface SignInButtonProps {
  label: string
}

/**
 * Кнопка входа — сразу редиректит на Ключницу (auth.letar.best).
 * Промежуточная страница /sign-in не нужна: kami использует ТОЛЬКО Ключницу.
 */
export function SignInButton({ label }: SignInButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    await signInWithLetarAuth(window.location.pathname)
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleSignIn} loading={loading}>
      <LogIn size={16} />
      <Text display={{ base: 'none', md: 'inline' }}>{label}</Text>
    </Button>
  )
}

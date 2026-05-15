'use client'

import { Button, HStack, Text } from '@chakra-ui/react'
import { LuLogOut, LuUser } from 'react-icons/lu'

import { signInWithLetarAuth, signOut, useSession } from '@/lib/auth-client'

/**
 * Кнопка входа / информация о пользователе
 */
export function SignInButton() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <Button variant="outline" size="lg" w="full" disabled>
        Загрузка...
      </Button>
    )
  }

  if (session?.user) {
    return (
      <HStack gap={3} w="full" justify="center">
        <HStack gap={2} color="fg.muted">
          <LuUser />
          <Text fontSize="sm">{session.user.name || session.user.email}</Text>
        </HStack>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })}
        >
          <LuLogOut />
          Выйти
        </Button>
      </HStack>
    )
  }

  return (
    <Button onClick={signInWithLetarAuth} variant="outline" size="lg" w="full">
      Войти для сохранения результатов
    </Button>
  )
}

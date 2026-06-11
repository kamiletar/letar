'use client'

import { logoutAction } from '@/app/_actions/auth.actions'
import { signInWithLetarAuth, useSession } from '@/lib/auth-client'
import { HStack } from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import { UserMenu } from '@letar/ui'

import { LocaleSwitcher } from './locale-switcher'

/** Панель с кнопками переключения языка, темы и пользователя */
export function Toolbar() {
  const { data: session } = useSession()

  return (
    <HStack pos="fixed" top={4} right={4} zIndex={10} gap={1} opacity={0.7} _hover={{ opacity: 1 }}>
      <LocaleSwitcher />
      <ColorModeButton />
      <UserMenu
        session={session?.user ?? null}
        onSignIn={() => signInWithLetarAuth()}
        onSignOut={logoutAction}
        profileHref="/profile"
      />
    </HStack>
  )
}

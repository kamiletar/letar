'use client'

import { Link } from '@/i18n/navigation'
import { signInWithLetarAuth, signOut, useSession } from '@/lib/auth-client'
import { Avatar, HStack, IconButton } from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import { LuKeyRound, LuLogIn, LuLogOut } from 'react-icons/lu'

import { LocaleSwitcher } from './locale-switcher'

/** Панель с кнопками переключения языка, темы и пользователя */
export function Toolbar() {
  const { data: session } = useSession()

  return (
    <HStack pos="fixed" top={4} right={4} zIndex={10} gap={1} opacity={0.7} _hover={{ opacity: 1 }}>
      <LocaleSwitcher />
      <ColorModeButton />

      {session
        ? (
          <>
            <IconButton variant="ghost" size="sm" aria-label="Profile" asChild>
              <Link href="/profile">
                <Avatar.Root size="xs">
                  {session.user.image && <Avatar.Image src={session.user.image} />}
                  <Avatar.Fallback>{session.user.name?.[0] || '?'}</Avatar.Fallback>
                </Avatar.Root>
              </Link>
            </IconButton>
            <IconButton variant="ghost" size="sm" aria-label="Аккаунт в Ключнице" asChild>
              <a href="https://auth.letar.best/profile" target="_blank" rel="noopener noreferrer">
                <LuKeyRound />
              </a>
            </IconButton>
            <IconButton variant="ghost" size="sm" aria-label="Sign out" onClick={() => signOut()}>
              <LuLogOut />
            </IconButton>
          </>
        )
        : (
          <IconButton variant="ghost" size="sm" aria-label="Sign in" onClick={() => signInWithLetarAuth()}>
            <LuLogIn />
          </IconButton>
        )}
    </HStack>
  )
}

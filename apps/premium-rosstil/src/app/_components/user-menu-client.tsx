'use client'

import { logoutAction } from '@/app/_actions/auth.actions'
import { Link } from '@/i18n/navigation'
import { Avatar, Button, Menu, Portal, Text } from '@chakra-ui/react'
import { FaSignOutAlt, FaUser } from 'react-icons/fa'

interface UserMenuClientProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
  }
}

/**
 * Client Component для отображения меню пользователя.
 * Получает данные пользователя через props вместо useSession().
 * Это позволяет родительскому компоненту быть Server Component.
 */
export function UserMenuClient({ user }: UserMenuClientProps) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button data-testid="user-menu" colorPalette={'fg'} variant="ghost" gap={2} pr={0}>
          <Text display={{ base: 'none', md: 'block' }}>{user.name}</Text>
          <Avatar.Root size="sm">
            <Avatar.Fallback name={user.name ?? undefined} />
            <Avatar.Image src={user.image ?? undefined} />
          </Avatar.Root>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value={'profile'} asChild>
              <Link href="/profile">
                <FaUser />
                Профиль
              </Link>
            </Menu.Item>
            {user.role === 'ADMIN' && (
              <>
                <Menu.Separator />
                <Menu.Item value="admin" asChild>
                  <Link href="/admin">
                    <FaUser />
                    Админка
                  </Link>
                </Menu.Item>
              </>
            )}
            <Menu.Separator />
            <Menu.Item value="signout" asChild>
              <form action={logoutAction}>
                <Button type="submit" variant="plain" gap={2} color="red.500" w="full" justifyContent="flex-start">
                  <FaSignOutAlt />
                  Выйти
                </Button>
              </form>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

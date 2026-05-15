'use client'

import { signOut } from '@/lib/auth-client'
import { Avatar, Menu, Portal } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LuLayoutDashboard, LuLogOut, LuUser } from 'react-icons/lu'

interface UserMenuProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()
  const displayName = user.name || user.email || 'Пользователь'
  const initials = displayName.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger rounded="full" focusRing="outside" cursor="pointer">
        <Avatar.Root size="sm">
          {user.image && <Avatar.Image src={user.image} />}
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar.Root>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="200px">
            <Menu.Item value="dashboard" asChild>
              <Link href="/dashboard">
                <LuLayoutDashboard />
                Личный кабинет
              </Link>
            </Menu.Item>
            <Menu.Item value="profile" asChild>
              <Link href="/profile">
                <LuUser />
                Профиль
              </Link>
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item
              value="logout"
              color="fg.error"
              _hover={{ bg: 'bg.error', color: 'fg.error' }}
              onClick={handleSignOut}
            >
              <LuLogOut />
              Выход
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

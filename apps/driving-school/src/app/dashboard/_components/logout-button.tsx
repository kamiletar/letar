'use client'

import { logoutAction } from '@/app/_actions/auth.actions'
import { Button } from '@chakra-ui/react'
import { LuLogOut } from 'react-icons/lu'

/**
 * Кнопка выхода из системы.
 * Использует server action для безопасного logout.
 */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" size="sm" color="fg.muted">
        <LuLogOut />
        Выход
      </Button>
    </form>
  )
}

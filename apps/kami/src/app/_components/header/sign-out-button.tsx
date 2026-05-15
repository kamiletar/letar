'use client'

import { logoutAction } from '@/app/_actions/auth.actions'
import { Button } from '@chakra-ui/react'
import { LogOut } from 'lucide-react'

interface SignOutButtonProps {
  /** Локаль — сохранена для совместимости, не используется (middleware next-intl обрабатывает редирект) */
  locale?: string
  /** Текст кнопки */
  label: string
}

/**
 * Кнопка выхода из аккаунта
 *
 * Использует Server Action для выхода из системы.
 * После выхода редирект на `/` — middleware next-intl
 * перенаправит на правильную локаль.
 */
export function SignOutButton({ label }: SignOutButtonProps) {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" size="sm" w="100%" justifyContent="flex-start" gap={2}>
        <LogOut size={14} />
        {label}
      </Button>
    </form>
  )
}

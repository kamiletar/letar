'use client'

import type { UserRole } from '@/generated/prisma'
import { Button } from '@chakra-ui/react'
import { useState } from 'react'
import { toggleRoleAction } from '../_actions/toggle-role.action'

interface RoleToggleButtonProps {
  userId: string
  currentRoles: UserRole[]
  /** Текущий пользователь (для блокировки кнопки у самого себя) */
  currentUserId: string
}

/**
 * Кнопка переключения роли ADMIN
 */
export function RoleToggleButton({ userId, currentRoles, currentUserId }: RoleToggleButtonProps) {
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState(currentRoles)

  const isAdmin = roles.includes('ADMIN')
  const isSelf = userId === currentUserId

  async function handleToggle() {
    setLoading(true)
    const result = await toggleRoleAction(userId, 'ADMIN')
    if (result.success && result.roles) {
      setRoles(result.roles)
    }
    setLoading(false)
  }

  return (
    <Button
      size="xs"
      variant={isAdmin ? 'solid' : 'outline'}
      colorPalette={isAdmin ? 'purple' : 'gray'}
      onClick={handleToggle}
      loading={loading}
      disabled={isSelf}
      title={isSelf ? 'Нельзя менять свои роли' : isAdmin ? 'Убрать админа' : 'Сделать админом'}
    >
      {isAdmin ? 'ADMIN' : 'USER'}
    </Button>
  )
}

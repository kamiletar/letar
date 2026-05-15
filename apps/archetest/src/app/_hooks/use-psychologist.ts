'use client'

import { useSession } from '@/lib/auth-client'
import { useIsAdmin } from './use-admin'

/**
 * Проверяет, является ли текущий пользователь психологом
 */
export function useIsPsychologist() {
  const { data: session } = useSession()
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles
  const isPsychologist = roles?.includes('PSYCHOLOGIST') ?? false
  return { isPsychologist }
}

/**
 * Возвращает true, если нужно показывать клинические названия
 * (для админов и психологов)
 */
export function useShowClinicalNames() {
  const { isAdmin } = useIsAdmin()
  const { isPsychologist } = useIsPsychologist()
  return isAdmin || isPsychologist
}

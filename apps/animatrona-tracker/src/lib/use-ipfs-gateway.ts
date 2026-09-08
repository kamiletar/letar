'use client'

/**
 * Хук клиентских компонентов — применяет кастомный IPFS gateway пользователя
 * (`User.customGateway`, настраивается в /profile) ко всем URL контента.
 */

import { useMemo } from 'react'

import { useSession } from '@/lib/auth-client'
import type { UserWithRole } from '@/lib/auth.types'
import { getIpfsUrl, getPosterUrl, getVideoUrl, resolveImageUrl, type UserIpfsSettings } from '@/lib/ipfs'

export function useIpfsGateway() {
  const { data: session } = useSession()

  const userSettings: UserIpfsSettings | undefined = useMemo(() => {
    const customGateway = (session?.user as UserWithRole | undefined)?.customGateway
    return customGateway ? { customGateway } : undefined
  }, [session])

  return useMemo(
    () => ({
      getIpfsUrl: (cid: string, path?: string) => getIpfsUrl(cid, path, userSettings),
      getVideoUrl: (cid: string) => getVideoUrl(cid, userSettings),
      getPosterUrl: (cid: string) => getPosterUrl(cid, userSettings),
      resolveImageUrl: (url: string | null | undefined, fallback?: string) =>
        resolveImageUrl(url, fallback, userSettings),
    }),
    [userSettings],
  )
}

'use client'

import { useEffect, useState } from 'react'

/**
 * `window.location.origin` известен только клиенту — до монтирования возвращает
 * пустую строку, чтобы не расходиться с SSR (React error 418, hydration mismatch).
 *
 * @returns origin текущей страницы, или '' до монтирования на клиенте
 *
 * @example
 * ```tsx
 * const origin = useClientOrigin()
 * const inviteUrl = inviteKey ? `${origin}/match/${matchId}/judge?key=${inviteKey}` : null
 * ```
 */
export function useClientOrigin(): string {
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  return origin
}

'use client'

import { useSyncExternalStore } from 'react'

const subscribeNoop = () => () => {}
const getServerSnapshot = () => ''
const getClientSnapshot = () => window.location.origin

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
  return useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot)
}

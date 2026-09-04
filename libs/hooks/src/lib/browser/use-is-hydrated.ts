'use client'

import { useSyncExternalStore } from 'react'

const subscribeNoop = () => () => {}
const getServerSnapshot = () => false
const getClientSnapshot = () => true

/**
 * Дожидается клиентской гидратации, не расходясь с SSR (React error 418, hydration mismatch).
 *
 * @returns `false` на сервере и до гидратации, `true` после первого клиентского рендера
 *
 * @example
 * ```tsx
 * const mounted = useIsHydrated()
 * if (!mounted) return null
 * ```
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot)
}

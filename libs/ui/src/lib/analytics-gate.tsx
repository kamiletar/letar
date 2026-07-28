'use client'

import type { ReactNode } from 'react'
import { useAnalyticsConsent } from './use-analytics-consent'

export interface AnalyticsGateProps {
  /** Ключ приложения для namespace согласия, напр. 'aira-web' (совпадает с appKey у CookieBanner) */
  appKey: string
  /** Версия политики — должна совпадать с `policyVersion` у CookieBanner этого приложения */
  policyVersion?: string
  children: ReactNode
}

/**
 * Рендерит `children` только после согласия пользователя на аналитику (152-ФЗ, personal-data.md §5).
 * Используется в Server Component layout вокруг аналитических скриптов:
 *
 * @example
 * <AnalyticsGate appKey="aira-web">
 *   <UmamiScript />
 * </AnalyticsGate>
 */
export function AnalyticsGate({ appKey, policyVersion, children }: AnalyticsGateProps) {
  const hasConsent = useAnalyticsConsent(appKey, policyVersion)
  return hasConsent ? children : null
}

'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { createConsentConfig, readConsentState } from './consent-types'

/**
 * Отслеживает согласие пользователя на аналитику (152-ФЗ, personal-data.md §5).
 * Читает состояние из localStorage и реактивно обновляется по событию
 * `{appKey}:consent-change`, которое диспатчит `CookieBanner` ПОСЛЕ записи в localStorage
 * (см. `persist()` в cookie-banner.tsx) — поэтому повторное чтение storage по этому событию
 * всегда видит уже актуальное значение, отдельно передавать `event.detail` не нужно.
 *
 * `useSyncExternalStore` — штатный примитив React 18+ для внешнего изменяемого хранилища:
 * не требует `useEffect`+`setState` для первого чтения (значит не «стреляет» set-state-in-effect)
 * и одновременно даёт корректный SSR-снимок (`false` — согласия нет, пока не доказано обратное).
 */
export function useAnalyticsConsent(appKey: string, policyVersion?: string): boolean {
  const { storageKey, consentChangeEvent } = createConsentConfig(appKey, policyVersion)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      window.addEventListener(consentChangeEvent, onStoreChange)
      return () => window.removeEventListener(consentChangeEvent, onStoreChange)
    },
    [consentChangeEvent],
  )

  const getSnapshot = useCallback(() => readConsentState(storageKey)?.analytics === true, [storageKey])
  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

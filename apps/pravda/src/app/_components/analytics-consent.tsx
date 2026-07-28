'use client'

import { UmamiScript } from '@letar/analytics'
import { createConsentConfig, readConsentState } from '@letar/ui'
import { useEffect, useState } from 'react'

const { storageKey, consentChangeEvent } = createConsentConfig('pravda')

/**
 * Consent-aware обёртка над UmamiScript.
 * Инициализирует аналитику только после явного согласия пользователя
 * (`analytics: true` в CookieBanner) — см. .claude/docs/personal-data.md §5.
 */
export function AnalyticsConsent() {
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    setHasConsent(readConsentState(storageKey)?.analytics === true)

    function onConsentChange(e: Event) {
      setHasConsent((e as CustomEvent<{ analytics: boolean }>).detail.analytics === true)
    }

    window.addEventListener(consentChangeEvent, onConsentChange)
    return () => window.removeEventListener(consentChangeEvent, onConsentChange)
  }, [])

  if (!hasConsent) {
    return null
  }

  return <UmamiScript />
}

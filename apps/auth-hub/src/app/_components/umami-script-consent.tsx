'use client'

import { UmamiScript } from '@letar/analytics'
import { createConsentConfig, readConsentState } from '@letar/ui'
import { useEffect, useState } from 'react'

const { storageKey, consentChangeEvent } = createConsentConfig('auth-hub')

export function UmamiScriptConsent() {
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    // Чтение consent-состояния из localStorage (внешняя система) после монтирования
    // oxlint-disable-next-line react/set-state-in-effect
    setHasConsent(readConsentState(storageKey)?.analytics === true)

    function onConsentChange(e: Event) {
      setHasConsent((e as CustomEvent<{ analytics: boolean }>).detail.analytics === true)
    }

    window.addEventListener(consentChangeEvent, onConsentChange)
    return () => window.removeEventListener(consentChangeEvent, onConsentChange)
  }, [])

  return <UmamiScript hasConsent={hasConsent} />
}

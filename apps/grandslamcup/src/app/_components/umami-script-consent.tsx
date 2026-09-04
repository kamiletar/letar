'use client'

import { UmamiScript } from '@letar/analytics'
import { createConsentConfig, readConsentState } from '@letar/ui'
import { useEffect, useState } from 'react'

const { storageKey, consentChangeEvent } = createConsentConfig('grandslamcup')

export function UmamiScriptConsent() {
  const [hasConsent, setHasConsent] = useState(false)

  // Чтение согласия из localStorage — легитимно только в эффекте (после гидратации),
  // иначе SSR/клиент разойдутся (localStorage недоступен на сервере).
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- источник — localStorage, не пропсы/состояние
    setHasConsent(readConsentState(storageKey)?.analytics === true)

    function onConsentChange(e: Event) {
      setHasConsent((e as CustomEvent<{ analytics: boolean }>).detail.analytics === true)
    }

    window.addEventListener(consentChangeEvent, onConsentChange)
    return () => window.removeEventListener(consentChangeEvent, onConsentChange)
  }, [])

  return <UmamiScript hasConsent={hasConsent} />
}

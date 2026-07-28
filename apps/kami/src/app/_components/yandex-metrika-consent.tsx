'use client'

import { createConsentConfig, readConsentState } from '@letar/ui'
import { YandexMetrika } from '@letar/yandex-metrika'
import { useEffect, useState } from 'react'

const { storageKey, consentChangeEvent } = createConsentConfig('kami')

interface YandexMetrikaConsentProps {
  counterId: number
}

/** Яндекс.Метрика, инициализируется только после согласия на аналитику (152-ФЗ) */
export function YandexMetrikaConsent({ counterId }: YandexMetrikaConsentProps) {
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    setHasConsent(readConsentState(storageKey)?.analytics === true)

    function onConsentChange(e: Event) {
      setHasConsent((e as CustomEvent<{ analytics: boolean }>).detail.analytics === true)
    }

    window.addEventListener(consentChangeEvent, onConsentChange)
    return () => window.removeEventListener(consentChangeEvent, onConsentChange)
  }, [])

  return <YandexMetrika YM_COUNTER_ID={counterId} hasConsent={hasConsent} />
}

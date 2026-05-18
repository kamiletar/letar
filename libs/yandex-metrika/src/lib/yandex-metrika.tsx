'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import ym, { YMInitializer } from 'react-yandex-metrika'

interface YandexMetrikaProps {
  YM_COUNTER_ID: number
  /**
   * Явное согласие пользователя на аналитические cookies (152-ФЗ).
   * undefined — инициализировать без проверки (обратная совместимость).
   * false — не инициализировать до получения согласия.
   * true — инициализировать.
   */
  hasConsent?: boolean
}

export function YandexMetrika({ YM_COUNTER_ID, hasConsent }: YandexMetrikaProps) {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname && YM_COUNTER_ID && hasConsent !== false) {
      ym('hit', pathname)
    }
  }, [pathname, YM_COUNTER_ID, hasConsent])

  if (!YM_COUNTER_ID || hasConsent === false) {
    return null
  }

  return (
    <YMInitializer
      accounts={[YM_COUNTER_ID]}
      options={{
        defer: true,
        webvisor: true,
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
      }}
      version="2"
    />
  )
}

export default YandexMetrika

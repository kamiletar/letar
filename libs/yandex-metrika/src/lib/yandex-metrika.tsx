'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import ym, { YMInitializer } from 'react-yandex-metrika'

export function YandexMetrika({ YM_COUNTER_ID }: { YM_COUNTER_ID: number }) {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname && YM_COUNTER_ID) {
      ym('hit', pathname)
    }
  }, [pathname, YM_COUNTER_ID])

  if (!YM_COUNTER_ID) {
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

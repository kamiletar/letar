'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import type { PropsWithChildren } from 'react'

import { system } from '@/theme'
import { OfflineConsentBanner } from './offline-consent-banner'
import { ServiceWorkerRegistration } from './service-worker-registration'
import { TopLoader } from './top-loader'

/**
 * Корневой провайдер приложения.
 *
 * Включает:
 * - Chakra UI с кастомной темой
 * - Поддержку тёмной/светлой темы
 * - TopLoader для индикации загрузки
 * - PWA: регистрацию Service Worker и banner согласия на оффлайн
 */
export function Providers({ children }: PropsWithChildren) {
  return (
    <ColorModeProvider>
      <RootChakraProvider value={system}>
        <TopLoader />
        {children}
        {/* PWA компоненты */}
        <ServiceWorkerRegistration />
        <OfflineConsentBanner />
      </RootChakraProvider>
    </ColorModeProvider>
  )
}

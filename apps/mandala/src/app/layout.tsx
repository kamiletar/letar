import { CartProvider } from '@/app/_components/cart'
import { JsonLd, organizationSchema, websiteSchema } from '@/app/_components/json-ld'
import { OfflineIndicator } from '@/app/_components/offline-indicator'
import { OnboardingProvider, OnboardingTooltip } from '@/app/_components/onboarding'
import { QueryProvider } from '@/app/_components/providers/query-provider'
import { ServiceWorkerRegistration } from '@/app/_components/service-worker-registration'
import { SessionProvider } from '@/app/_components/session-provider'
import { TransitionProvider } from '@/app/_components/transition-context'
import { Provider } from '@/app/_components/ui/provider'
import { Toaster } from '@/app/_components/ui/toaster'
import { YandexMetrika } from '@/app/_components/yandex-metrika'
import { UmamiScript } from '@letar/analytics'
import { CookieBanner, TopLoader } from '@letar/ui'
import type { Viewport } from 'next'
import type { JSX } from 'react'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#CA9E67',
}

// Метаданные перенесены в [locale]/layout.tsx для поддержки i18n
// Здесь только базовые настройки для всего приложения

/**
 * Корневой layout приложения
 *
 * Содержит базовые провайдеры, общие для всех страниц:
 * - SessionProvider — аутентификация
 * - QueryProvider — TanStack Query с IndexedDB персистентностью для PWA offline
 * - CartProvider — корзина
 * - Provider — Chakra UI
 * - YandexMetrika — аналитика
 *
 * Локализация добавляется в [locale]/layout.tsx
 */
export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html suppressHydrationWarning>
      <head>
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
      </head>
      <body suppressHydrationWarning>
        <SessionProvider>
          <QueryProvider>
            <CartProvider>
              <Provider>
                <TopLoader color="#CA9E67" />
                <TransitionProvider>
                  <OnboardingProvider>
                    {children}
                    <OnboardingTooltip />
                  </OnboardingProvider>
                </TransitionProvider>
                <Toaster />
                <ServiceWorkerRegistration />
                <OfflineIndicator />
                <YandexMetrika />
                <UmamiScript />
                <CookieBanner appKey="mandala" />
              </Provider>
            </CartProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

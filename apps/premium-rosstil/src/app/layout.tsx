import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
// oxlint-disable-next-line no-unassigned-import -- глобальные стили
import './global.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://premium.rosstil.ru'),
  title: {
    default: 'Дизайнерская Одежда — Премиум РосСтиль',
    template: '%s — Премиум РосСтиль',
  },
  description: 'Каталог премиальной дизайнерской одежды от Елены Аксяновой. Маркетплейс российских дизайнеров.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Премиум',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Премиум РосСтиль',
    description:
      'Наряды, созданные Еленой Аксяновой наполнены энергией, которая помогает быстро входить в нужное эмоциональное состояние.',
  },
  alternates: {
    canonical: '/',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#CA9E67',
}

// Корневой layout - минимальный, основной контент в [locale]/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}

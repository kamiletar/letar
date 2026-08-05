// @ts-check

import { composePlugins, withNx } from '@nx/next'
import withSerwistInit from '@serwist/next'
import createNextIntlPlugin from 'next-intl/plugin'

// Плагин next-intl для интернационализации
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// Serwist: SW для offline-first /express (этап 5.7, фестивальный режим).
// В dev отключён (Turbopack не поддерживает Serwist) — prod build идёт с --webpack
//
// register: false — критично. По умолчанию Serwist сам инжектит скрипт, который
// регистрирует /sw.js со scope '/' на КАЖДОЙ странице сайта безусловно, в обход
// консент-гейта useOfflineConsent в ServiceWorkerRegistration.tsx (найдено 2026-07-28:
// SW брал контроль над всем доменом без согласия пользователя). Регистрация теперь
// только вручную, из ServiceWorkerRegistration.tsx, со scope /express и /en/express.
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  register: false,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('@nx/next/plugins/with-nx').WithNxOptions} */
const nextConfig = {
  output: 'standalone',
  nx: {},
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  // Пустой turbopack — подавляет ошибку при наличии webpack config от Serwist
  turbopack: {},
}

const plugins = [withNx, withNextIntl, withSerwist]

export default composePlugins(...plugins)(nextConfig)

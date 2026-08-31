// @ts-check

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Workspace-либы вне корня приложения — без withNx (удалён, deprecated) webpack их не
  // транспилирует сам. См. .claude/docs/nextjs-nx-composeplugins-migration.md
  transpilePackages: [
    '@letar/analytics',
    '@letar/auth',
    '@letar/chakra-provider',
    '@letar/consent',
    '@letar/env-load',
    '@letar/forms',
    '@letar/forms-core',
    '@letar/forms-react',
    '@letar/glitchtip',
    '@letar/hooks',
    '@letar/i18n-proxy',
    '@letar/ui',
  ],
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  // Пустой turbopack — подавляет ошибку при наличии webpack config от Serwist
  turbopack: {},
}

export default withSerwist(withNextIntl(nextConfig))

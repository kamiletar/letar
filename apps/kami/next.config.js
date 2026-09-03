// @ts-check

const createNextIntlPlugin = require('next-intl/plugin')

// Плагин next-intl для интернационализации
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'standalone', // Для Docker деплоя
  trailingSlash: true, // Всегда добавляет конечный слеш в URL
  skipTrailingSlashRedirect: true, // Отключает 308 редирект для POST запросов (Better Auth)
  // sharp грузит libvips-cpp.so через dlopen(), трейсер это не ловит — без явного
  // include контейнер падает с ERR_DLOPEN_FAILED (инцидент mandala 2026-07-12).
  // Глоб без хардкода версии — переживёт апдейт sharp/bun.lock.
  outputFileTracingIncludes: {
    '/**/*': ['../../node_modules/.bun/@img+sharp-libvips-*/**/*.so*'],
  },
  // Workspace-либы вне корня приложения — без withNx (удалён, deprecated) webpack их не
  // транспилирует сам. См. .claude/docs/nextjs-nx-composeplugins-migration.md
  transpilePackages: [
    '@letar/analytics',
    '@letar/auth',
    '@letar/chakra-provider',
    '@letar/consent',
    '@letar/email',
    '@letar/env-load',
    '@letar/forms',
    '@letar/forms-core',
    '@letar/forms-react',
    '@letar/glitchtip',
    '@letar/hooks',
    '@letar/i18n-proxy',
    '@letar/image-upload',
    '@letar/seed-utils',
    '@letar/seo',
    '@letar/ui',
    '@letar/upload-validation',
    '@letar/yandex-metrika',
  ],
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  // Лимит body для proxy (для загрузки файлов до 500MB)
  experimental: {
    proxyClientMaxBodySize: '500mb',
  },
}

module.exports = withNextIntl(nextConfig)

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  // Standalone режим для запуска сервера внутри Electron
  output: 'standalone',
  distDir: '.next',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Пустой конфиг для Turbopack (Next.js 16)
  turbopack: {},
  // TODO: Исправить типы Chakra UI Field компонентов в Next.js 16
  typescript: {
    ignoreBuildErrors: true,
  },
  // Исключаем dev-only зависимости из standalone bundle (~15 MB экономии)
  serverExternalPackages: ['typescript'],
  webpack: (config, { isServer }) => {
    // В dev режиме для renderer используем electron-renderer
    if (!isServer && !isProd) {
      config.target = 'electron-renderer'
    }
    return config
  },
}

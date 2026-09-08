/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  // Статический экспорт — нет сервера, нет API routes, вся логика через Electron IPC
  output: 'export',
  distDir: '.next',
  trailingSlash: true,
  // Упакованное приложение грузит рендерер через привилегированную схему app://local/
  // (main/protocols/app.protocol.ts), не через file:// — абсолютные пути ("/_next/...")
  // резолвятся от корня схемы штатно, как в обычном вебе. assetPrefix не нужен.
  images: {
    unoptimized: true,
  },
  // TODO: типы @letar/forms (declarative table field) расходятся с версией @tanstack/react-table
  // при собственном typecheck `next build` (не tsgo) — тот же обход, что в label-printer-desktop.
  // Реальный гейт типов — `nx typecheck:tsgo`, он не задет этой проблемой.
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  webpack: (config, { isServer }) => {
    // В dev режиме для renderer используем electron-renderer
    if (!isServer && !isProd) {
      config.target = 'electron-renderer'
    }
    return config
  },
}

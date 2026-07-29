import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',

  // Транспиляция workspace библиотек
  transpilePackages: ['@letar/ui', '@letar/forms', '@letar/analytics', '@letar/chakra-provider', '@letar/infra-config'],

  // Оптимизация bundle size — tree-shaking для тяжёлых пакетов
  optimizePackageImports: ['recharts', '@chakra-ui/react', 'react-icons'],

  experimental: {
    // Включаем инструментирование для мониторинга
    instrumentationHook: true,
  },
}

export default nextConfig

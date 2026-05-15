import createMDX from '@next/mdx'
import { composePlugins, withNx } from '@nx/next'

// Serwist отключён — не поддерживает Turbopack (Next.js 16+)
// Используем простой sw.js из public/

const isProduction = process.env.NODE_ENV === 'production'

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  // Статический экспорт только для production build (не для dev)
  output: isProduction ? 'export' : undefined,
  // Trailing slash для корректных путей в статике
  trailingSlash: true,
  // Отключаем оптимизацию изображений для статического экспорта
  images: {
    unoptimized: true,
  },
  // Добавляем поддержку MDX как страниц
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  nx: {},
}

const withMDX = createMDX({
  // Плагины для MDX
  options: {
    // remark-gfm добавляет поддержку GFM (таблицы, strikethrough, autolinks и т.д.)
    // Используем строковый формат для совместимости с Turbopack
    remarkPlugins: [['remark-gfm', {}]],
    rehypePlugins: [],
  },
})

const plugins = [withNx, withMDX]

export default composePlugins(...plugins)(nextConfig)

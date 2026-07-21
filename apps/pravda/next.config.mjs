import createMDX from '@next/mdx'
import { composePlugins, withNx } from '@nx/next'
import { fileURLToPath } from 'node:url'

// Serwist отключён — не поддерживает Turbopack (Next.js 16+)
// Используем простой sw.js из public/

const isProduction = process.env.NODE_ENV === 'production'

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  // Статический экспорт только для production build (не для dev)
  output: isProduction ? 'export' : undefined,
  // Воркараунд https://github.com/vercel/next.js/issues/85374 (см. build/adapter.js) —
  // без него клиентская RSC-навигация между статьями ломается на статическом экспорте.
  ...(isProduction && { adapterPath: fileURLToPath(new URL('./build/adapter.js', import.meta.url)) }),
  // Trailing slash для корректных путей в статике
  trailingSlash: true,
  // Отключаем оптимизацию изображений для статического экспорта
  images: {
    unoptimized: true,
  },
  // Добавляем поддержку MDX как страниц
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  nx: {},
  transpilePackages: ['@letar/chakra-provider', '@letar/hooks', '@letar/analytics', '@letar/ui'],
  // Typecheck отдельно через nx typecheck:tsgo — Next.js не понимает TS project references
  // (см. tsconfig.json "references"), из-за чего собственный тайпчекер next build ложно валит
  // rootDir-проверку на любом path-mapped импорте из libs/ (e.g. @letar/chakra-provider). Тот же
  // паттерн уже у 14 других приложений монорепо (grandslamcup, kami, aboi, driving-school, time...).
  typescript: {
    ignoreBuildErrors: true,
  },
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

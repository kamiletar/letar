import baseConfig from '../../eslint.config.mjs'

export default [
  ...baseConfig,
  {
    // `.source/` — вывод Fumadocs (`fumadocs-mdx`). Файлы перезаписываются на каждом
    // `next dev`/`next build` и лежат в `.gitignore`, поэтому чинить в них `@ts-nocheck`
    // и `{}`-типы бессмысленно — правки исчезнут при следующей генерации.
    // Пути от корня workspace: `@nx/eslint:lint` переключает cwd на workspace root
    // перед запуском ESLint, поэтому `ignores`-паттерны резолвятся относительно него,
    // а не относительно этого файла — короткий `.source/**` совпадения не даёт.
    ignores: ['apps/form-docs/.source/**', 'apps/form-docs/.next/**', '**/out-tsc'],
  },
]

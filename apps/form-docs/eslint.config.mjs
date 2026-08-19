import baseConfig from '../../eslint.config.mjs'

export default [
  ...baseConfig,
  {
    // `.source/` — вывод Fumadocs (`fumadocs-mdx`). Файлы перезаписываются на каждом
    // `next dev`/`next build` и лежат в `.gitignore`, поэтому чинить в них `@ts-nocheck`
    // и `{}`-типы бессмысленно — правки исчезнут при следующей генерации.
    // Таргет `lint` — `nx:run-commands` с `cwd: "apps/form-docs"` (не `@nx/eslint:lint`,
    // который переключает cwd на workspace root), поэтому `ignores`-паттерны резолвятся
    // относительно этого файла — префикс `apps/form-docs/` совпадения не даёт.
    ignores: ['.source/**', '.next/**', '**/out-tsc'],
  },
]

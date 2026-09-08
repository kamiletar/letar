import nextEslintPluginNext from '@next/eslint-plugin-next'
import nx from '@nx/eslint-plugin'
import baseConfig from '../../eslint.config.mjs'

export default [
  {
    ignores: ['.next/**', '**/out-tsc/**', 'src/generated/**', 'public/**', 'prisma/**'],
  },
  ...nx.configs['flat/react-typescript'],
  { plugins: { '@next/next': nextEslintPluginNext } },
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      // Next.js specific
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'off',
    },
  },
]

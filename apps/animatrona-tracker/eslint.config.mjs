import nextEslintPluginNext from '@next/eslint-plugin-next'
import nx from '@nx/eslint-plugin'
import baseConfig from '../../eslint.config.mjs'

export default [
  ...nx.configs['flat/react-typescript'],
  { plugins: { '@next/next': nextEslintPluginNext } },
  ...baseConfig,
  {
    ignores: ['.next/**/*', '**/out-tsc', 'src/generated/**/*', 'public/**/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Next.js specific
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'off',

      // Project-specific overrides
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-useless-escape': 'off',
    },
  },
]

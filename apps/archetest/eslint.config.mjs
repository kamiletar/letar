import nextEslintPluginNext from '@next/eslint-plugin-next'
import nx from '@nx/eslint-plugin'
import baseConfig from '../../eslint.config.mjs'

export default [
  { plugins: { '@next/next': nextEslintPluginNext } },
  ...baseConfig,
  ...nx.configs['flat/react-typescript'],
  {
    // public/sw.js и swe-worker — сгенерированные Serwist бандлы (минифицированные)
    ignores: ['.next/**/*', '**/out-tsc', 'public/sw.js', 'public/swe-worker-*.js'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
]

import nextEslintPluginNext from '@next/eslint-plugin-next'
import nx from '@nx/eslint-plugin'
import baseConfig from '../../eslint.config.mjs'

export default [
  { plugins: { '@next/next': nextEslintPluginNext } },
  ...nx.configs['flat/react-typescript'],
  ...baseConfig,
  {
    // public/sw.js, public/swe-worker-*.js — в общем ignores корневого eslint.config.mjs
    ignores: ['.next/**/*', '**/out-tsc'],
  },
]

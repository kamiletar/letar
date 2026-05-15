import baseConfig from '../../eslint.config.mjs'

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // CLI-утилита + Electron — console.log ожидаем
      'no-console': 'off',
    },
  },
  { ignores: ['dist/**/*', 'app/**/*'] },
]

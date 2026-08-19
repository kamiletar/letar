import baseConfig from '../../../eslint.config.mjs'

export default [
  ...baseConfig,
  { ignores: ['dist/**/*', 'webpack.config.js'] },
  // Вложенный конфиг резолвит `files` от своего каталога (без сегмента `main/`) — allow-list
  // `no-restricted-syntax` из корневого eslint.config.mjs (files: ['main/**/*.ts', ...]) сюда
  // не дотягивается. См. .claude/docs/node-env-not-production-signal.md § Случай 5.
  {
    files: ['**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]

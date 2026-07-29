import reactHooksPlugin from 'eslint-plugin-react-hooks'
import baseConfig from '../../eslint.config.mjs'

export default [
  ...baseConfig,
  {
    // Корневой конфиг собран из `@nx/eslint-plugin` (flat/base + typescript + javascript)
    // и плагин react-hooks не регистрирует. Без этого блока правило
    // `react-hooks/exhaustive-deps` не резолвится: проверка зависимостей хуков не работает,
    // а существующие `eslint-disable-next-line react-hooks/exhaustive-deps` сами становятся
    // ошибками «Definition for rule was not found».
    //
    // Подключаем только две классические проверки. Пресет `recommended` в v7 тянет ещё
    // ~14 правил React Compiler (purity, immutability, set-state-in-effect и прочие) —
    // это отдельная большая задача, не для починки конфига.
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  { ignores: ['dist/**/*', '.next/**/*', '**/out-tsc'] },
]

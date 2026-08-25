import baseConfig from '../../eslint.config.mjs'

export default [
  ...baseConfig,
  // Vue-библиотека, не React — `react-hooks/rules-of-hooks` (корневой eslint.config.mjs)
  // ложно триггерится на Vue composables (useAppFormContext, useFormGroup и т.п.), вызываемые
  // внутри Vue `setup()`. Названы по конвенции Vue `use*`, но не являются React Hook.
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
]

import playwright from 'eslint-plugin-playwright'
import baseConfig from '../../eslint.config.mjs'

export default [
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      // Playwright-фикстуры вызывают `use(page)` — это параметр use() из test.extend(),
      // не React-хук. eslint-plugin-react-hooks не различает их по имени и ложно
      // срабатывает на функциях-фикстурах (adminPage/guestPage), не являющихся компонентами.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
]

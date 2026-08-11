import { buildFormsCoreAlias } from '@letar/forms-core/testing'
import { resolve } from 'path'
import { defineConfig } from 'vite'

const formsCoreAlias = buildFormsCoreAlias(resolve(__dirname, '../../forms-core'))

/**
 * Минимальный dev-харнесс (Поток 1, письмо #61) — не Nx-приложение, потому что в монорепо нет
 * ни одного Vue-приложения на Vite, а заводить одно ради визуальной проверки 6 полей
 * непропорционально задаче. Запуск: `bunx vite demo` из `libs/forms-vue-shadcn`.
 */
export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      ...formsCoreAlias,
      '@letar/forms-vue': resolve(__dirname, '../../forms-vue/src/index.ts'),
    },
  },
})

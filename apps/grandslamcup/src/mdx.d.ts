/** Типы для импорта MDX файлов как React компонентов */
declare module '*.mdx' {
  import type { ComponentType } from 'react'

  const component: ComponentType
  export default component
  export const metadata: Record<string, string>
}

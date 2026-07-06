import { Text, type TextProps } from '@chakra-ui/react'

export interface BuildVersionProps extends Omit<TextProps, 'children'> {
  /**
   * Версия из package.json.
   * Рекомендуемый способ — импорт в Server Component:
   * ```tsx
   * import pkg from '../../package.json'
   * <BuildVersion version={pkg.version} />
   * ```
   * Или через переменную окружения:
   * ```js
   * // next.config.js → env: { NEXT_PUBLIC_APP_VERSION: require('./package.json').version }
   * <BuildVersion version={process.env.NEXT_PUBLIC_APP_VERSION} />
   * ```
   */
  version?: string
}

/**
 * Версия сборки для подвала сайта.
 * Помогает привязать баг-репорт к конкретному релизу.
 * Если версия не передана — не рендерится.
 */
export function BuildVersion({ version, fontSize = 'xs', color = 'fg.muted', ...props }: BuildVersionProps) {
  if (!version) {
    return null
  }
  return (
    <Text fontSize={fontSize} color={color} {...props}>
      v{version}
    </Text>
  )
}

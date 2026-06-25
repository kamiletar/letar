import { Text, type TextProps } from '@chakra-ui/react'

export interface StudioCreditProps extends Omit<TextProps, 'children'> {
  /** UTM-метка источника (имя приложения, slug) */
  app: string
}

/**
 * Кредитная ссылка «Сделано в studio.letar.best» для подвала сайтов.
 * Добавляет UTM-параметр для трекинга переходов в Umami студии.
 *
 * @example
 * ```tsx
 * <StudioCredit app="kami" />
 * // → Сделано в <a href="https://studio.letar.best/?utm_source=kami">studio.letar.best</a>
 * ```
 */
export function StudioCredit({ app, fontSize = 'xs', color = 'fg.muted', ...props }: StudioCreditProps) {
  const href = `https://studio.letar.best/?utm_source=${app}&utm_medium=footer&utm_campaign=studio-credit`
  return (
    <Text fontSize={fontSize} color={color} {...props}>
      Сделано в{' '}
      <Text as="span" textDecoration="underline" textUnderlineOffset="2px" _hover={{ color: 'fg' }}>
        <a href={href} target="_blank" rel="noopener noreferrer">
          studio.letar.best
        </a>
      </Text>
    </Text>
  )
}

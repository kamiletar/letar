import { Link, type LinkProps, VisuallyHidden } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { LuArrowUpRight } from 'react-icons/lu'

export interface OutboundLinkProps extends Omit<LinkProps, 'href' | 'target' | 'rel' | 'asChild'> {
  /** Адрес чужого сайта. Свой маршрут — кнопкой-переходом или контекстной ссылкой без иконки. */
  href: string
  children: ReactNode
  /** Подпись для экранного диктора после текста ссылки. */
  newTabLabel?: string
}

/**
 * Текстовая ссылка на чужой сайт с иконкой исходящей ссылки ↗ — как в десктопных программах:
 * иконка заранее говорит, что пользователь уйдёт из приложения. Открывается в новой вкладке
 * с `rel="noopener noreferrer"`.
 *
 * Не путать с `ExternalLink` — там круглая кнопка-иконка без текста (соцсети, email).
 * Договорённость о видах ссылок — `.claude/docs/link-vs-button-navigation-convention.md`.
 *
 * `display="inline"` вместо inline-flex из рецепта: длинный текст ссылки переносится по словам
 * вместе с фразой, а иконка остаётся после последнего слова, а не по центру блока.
 *
 * @example
 * ```tsx
 * <OutboundLink href="https://doi.org/10.1126/science.273.5282.1699">Greenwald et al. (1996)</OutboundLink>
 * ```
 */
export function OutboundLink({
  href,
  children,
  newTabLabel = '(откроется в новой вкладке)',
  ...props
}: OutboundLinkProps) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" display="inline" {...props}>
      {children}
      <LuArrowUpRight
        aria-hidden
        style={{
          display: 'inline',
          width: '0.9em',
          height: '0.9em',
          marginInlineStart: '0.15em',
          verticalAlign: '-0.1em',
        }}
      />
      <VisuallyHidden>{` ${newTabLabel}`}</VisuallyHidden>
    </Link>
  )
}

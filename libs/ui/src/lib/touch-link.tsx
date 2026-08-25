import { Link, type LinkProps } from '@chakra-ui/react'
import NextLink from 'next/link'

export interface TouchLinkProps extends Omit<LinkProps, 'asChild'> {
  href: string
  children: React.ReactNode
}

/**
 * Текстовая ссылка с высотой не ниже 44px (WCAG 2.5.5 touch target) —
 * без этого узкая строка текста не даёт достаточной цели для тапа на мобильном.
 * Обёртка над Chakra `Link` + `next/link`, минимальная высота задана литералом
 * (не через тему-специфичный токен), чтобы работать одинаково в любом приложении.
 *
 * @example
 * ```tsx
 * <TouchLink href="/houses/" color="fg.muted" _hover={{ color: 'fg' }}>
 *   Все проекты
 * </TouchLink>
 * ```
 */
export function TouchLink({ href, children, minH = '2.75rem', alignItems = 'center', ...props }: TouchLinkProps) {
  return (
    <Link asChild minH={minH} alignItems={alignItems} {...props}>
      <NextLink href={href}>{children}</NextLink>
    </Link>
  )
}

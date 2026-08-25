import { Link, type LinkProps } from '@chakra-ui/react'
import NextLink from 'next/link'

export interface TouchLinkProps extends Omit<LinkProps, 'asChild'> {
  href: string
  children: React.ReactNode
  /**
   * Компонент ссылки для рендера внутри `asChild` — по умолчанию `next/link`.
   * Передавай локализованный `Link` из `@/i18n/navigation` (next-intl) в
   * приложениях, где навигация должна сохранять префикс локали.
   */
  linkComponent?: React.ComponentType<{ href: string; children: React.ReactNode }>
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
 *
 * @example С локализованной навигацией (next-intl)
 * ```tsx
 * import { Link } from '@/i18n/navigation'
 *
 * <TouchLink href="/cart" linkComponent={Link} color="fg.muted">
 *   Корзина
 * </TouchLink>
 * ```
 */
export function TouchLink({
  href,
  children,
  linkComponent: LinkComponent = NextLink,
  minH = '2.75rem',
  alignItems = 'center',
  ...props
}: TouchLinkProps) {
  return (
    <Link asChild minH={minH} alignItems={alignItems} {...props}>
      <LinkComponent href={href}>{children}</LinkComponent>
    </Link>
  )
}

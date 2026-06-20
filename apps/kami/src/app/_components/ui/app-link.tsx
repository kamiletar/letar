'use client'

import { Link } from '@/i18n/navigation'
import { Button, type ButtonProps } from '@chakra-ui/react'
import { Pressable } from '@letar/ui'
import type { ComponentProps } from 'react'

type AppLinkProps = Omit<ButtonProps, 'asChild'> & {
  href: ComponentProps<typeof Link>['href']
  locale?: ComponentProps<typeof Link>['locale']
}

/**
 * Навигационная ссылка с ripple-эффектом.
 * Использует next-intl Link + Chakra Button asChild + Pressable.
 */
export function AppLink({ href, locale, children, borderRadius = 'md', ...props }: AppLinkProps) {
  return (
    <Pressable borderRadius={borderRadius} display="inline-flex">
      <Button asChild {...props}>
        <Link href={href} locale={locale}>
          {children}
        </Link>
      </Button>
    </Pressable>
  )
}

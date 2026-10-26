'use client'

import { Button } from '@chakra-ui/react'
import { trackEvent } from '@letar/analytics'

type Props = {
  href: string
  label: string
  /** Где стоит кнопка: для события Umami `site-cta` */
  place: 'hero' | 'final'
}

/** Кнопка-ссылка на заявку студии; клик уходит в Umami событием `site-cta`. */
export function SiteCtaLink({ href, label, place }: Props) {
  return (
    <Button
      asChild
      size="lg"
      minH="48px"
      px={7}
      fontSize="md"
      fontWeight="semibold"
      colorPalette="gray"
      variant="solid"
      _focusVisible={{ outline: '2px solid', outlineColor: 'fg.muted', outlineOffset: '3px' }}
    >
      <a href={href} onClick={() => trackEvent('site-cta', { place })}>{label}</a>
    </Button>
  )
}

'use client'

import { Button } from '@chakra-ui/react'
import { trackEvent } from '@letar/analytics'
import { useSyncExternalStore } from 'react'

type Props = {
  href: string
  label: string
  /** Где стоит кнопка: для события Umami `site-cta` */
  place: 'hero' | 'final'
}

const subscribeNever = () => () => {}
const readRef = () => new URLSearchParams(window.location.search).get('ref')

function withRef(href: string, ref: string) {
  const url = new URL(href)
  url.searchParams.set('ref', ref)
  return url.toString()
}

/** Кнопка-ссылка на страницу услуг студии; клик уходит в Umami событием `site-cta`. */
export function SiteCtaLink({ href, label, place }: Props) {
  // Страница статическая: код партнёра `?ref` из адреса kami дописываем после гидратации, без изменений
  const ref = useSyncExternalStore(subscribeNever, readRef, () => null)
  const target = ref ? withRef(href, ref) : href

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
      <a href={target} onClick={() => trackEvent('site-cta', { place })}>{label}</a>
    </Button>
  )
}

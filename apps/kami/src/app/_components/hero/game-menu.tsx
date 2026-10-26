'use client'

import { Link, useRouter } from '@/i18n/navigation'
import { Box, Link as ChakraLink, Stack, Text } from '@chakra-ui/react'
import { trackEvent } from '@letar/analytics'
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

export interface GameMenuItem {
  key: string
  href: string
  label: string
  hint: string
}

/** Ключ sessionStorage: переход в посадочную из меню этой вкладки (KM-031). */
export const MENU_ENTRY_FLAG = 'kami.entry.from-menu'
/** Длительность реакции на выбор до перехода, мс. */
const SELECT_DELAY = 250

const noopSubscribe = () => () => {}
const hasModifier = (event: MouseEvent) => event.metaKey || event.ctrlKey || event.shiftKey || event.altKey

/**
 * Меню главной как стартовое меню игры: маркер ▶, стрелки, Home/End, реакция на выбор.
 * Остаётся обычной навигацией из ссылок: без JS есть порядок и подписи, нет маркера.
 */
export function GameMenu({ items, ariaLabel }: { items: GameMenuItem[]; ariaLabel: string }) {
  const router = useRouter()
  const navRef = useRef<HTMLElement>(null)
  // Без JS и до гидратации маркера нет: на сервере `mounted` ложно.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const [pointed, setActive] = useState<number | null>(null)
  const active = mounted ? pointed ?? 0 : null
  const [selected, setSelected] = useState<number | null>(null)
  const busy = useRef(false)

  const select = useCallback((index: number) => {
    const item = items[index]
    if (!item || busy.current) { return }
    busy.current = true
    trackEvent('menu-select', { key: item.key })
    if (item.key === 'order') {
      try {
        sessionStorage.setItem(MENU_ENTRY_FLAG, `${Date.now()}:${performance.timeOrigin}`)
      } catch { /* приватный режим: посадочная откроется статично */ }
    }
    const go = () => {
      busy.current = false
      setSelected(null)
      router.push(item.href)
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      go()
      return
    }
    setSelected(index)
    const link = navRef.current?.querySelectorAll('a')[index]
    const box = link?.getBoundingClientRect()
    if (box) {
      window.dispatchEvent(
        new CustomEvent('kami:menu-select', { detail: { x: box.left + 24, y: box.top + box.height / 2 } }),
      )
    }
    window.setTimeout(go, SELECT_DELAY)
  }, [items, router])

  // Клик по видимому пункту во время церемонии: фон уже пропустил вход, дальше — обычный выбор.
  useEffect(() => {
    const onActivate = (event: Event) => {
      const index = (event as CustomEvent<{ index: number }>).detail?.index
      if (typeof index === 'number') { select(index) }
    }
    window.addEventListener('kami:menu-activate', onActivate)
    return () => window.removeEventListener('kami:menu-activate', onActivate)
  }, [select])

  const move = (to: number) => {
    const links = navRef.current?.querySelectorAll('a')
    links?.[to]?.focus()
    setActive(to)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) { return }
    const current = active ?? 0
    const last = items.length - 1
    const target = event.key === 'ArrowDown'
      ? (current + 1) % items.length
      : event.key === 'ArrowUp'
      ? (current - 1 + items.length) % items.length
      : event.key === 'Home'
      ? 0
      : event.key === 'End'
      ? last
      : null
    if (target === null) { return }
    event.preventDefault()
    move(target)
  }

  return (
    <Stack asChild gap={2} align="stretch" w="full" maxW="md">
      <nav ref={navRef} aria-label={ariaLabel} onKeyDown={onKeyDown}>
        {items.map((item, index) => {
          const primary = index === 0
          return (
            <ChakraLink
              key={item.key}
              data-entry-menu=""
              data-entry-index={index}
              data-menu-key={item.key}
              data-active={active === index ? '' : undefined}
              data-selected={selected === index ? '' : undefined}
              asChild
              position="relative"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="flex-start"
              textAlign="start"
              gap={0.5}
              pl={10}
              pr={4}
              py={primary ? 3 : 2}
              minH={primary ? '64px' : '56px'}
              color="inherit"
              textDecoration="none"
              borderRadius="md"
              bg={primary ? { base: 'white/70', _dark: 'bg/70' } : { base: 'white/45', _dark: 'bg/45' }}
              backdropFilter="blur(12px) saturate(140%)"
              borderWidth={primary ? '2px' : '1px'}
              borderColor={primary ? 'fg.muted' : { base: 'fg.700/20', _dark: 'fg.200/20' }}
              shadow={primary ? 'md' : 'sm'}
              _hover={{ bg: { base: 'white/65', _dark: 'bg/65' }, borderColor: 'fg.muted' }}
              _focusVisible={{ outline: '2px solid', outlineColor: 'fg.muted', outlineOffset: '3px' }}
              css={{
                '&[data-selected] [data-menu-marker]': { animation: 'kamiMarkerFlash 250ms ease-out' },
                '@keyframes kamiMarkerFlash': {
                  '0%': { opacity: 1 },
                  '30%': { opacity: 0.1 },
                  '60%': { opacity: 1 },
                  '80%': { opacity: 0.3 },
                  '100%': { opacity: 1 },
                },
              }}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
            >
              <Link
                href={item.href}
                onClick={(event) => {
                  if (event.button !== 0 || hasModifier(event)) { return }
                  event.preventDefault()
                  select(index)
                }}
              >
                <Box
                  aria-hidden="true"
                  data-menu-marker=""
                  position="absolute"
                  left={4}
                  top="50%"
                  mt="-0.6em"
                  fontFamily="mono"
                  fontSize={primary ? 'xl' : 'lg'}
                  lineHeight="1.2"
                  opacity={active === index ? 1 : 0}
                  transitionProperty="opacity"
                  transitionDuration="fast"
                >
                  ▶
                </Box>
                <Text
                  asChild
                  fontSize={primary ? { base: '2xl', md: '3xl' } : { base: 'xl', md: '2xl' }}
                  fontWeight={primary ? 'semibold' : 'medium'}
                >
                  <span>{item.label}</span>
                </Text>
                <Text asChild fontSize="sm" color="fg.muted" fontWeight="normal">
                  <span>{item.hint}</span>
                </Text>
              </Link>
            </ChakraLink>
          )
        })}
      </nav>
    </Stack>
  )
}

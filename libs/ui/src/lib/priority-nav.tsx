'use client'

/**
 * Priority Plus навигация: видимые пункты + дропдаун "Ещё" с тем, что не влезло в ширину
 * контейнера. Замер через ResizeObserver — без него длинные многословные пункты (как
 * «Как мы подбираем дом») переносятся на вторую строку вместо того, чтобы уйти в overflow.
 * Портировано из apps/grandslamcup/src/app/_components/header/desktop-nav.tsx (первый
 * потребитель), где логика проверена; здесь — без иконок в overflow-меню, т.к. не всем
 * приложениям они нужны.
 */

import { Box, HStack, Menu, Portal } from '@chakra-ui/react'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LuChevronDown } from 'react-icons/lu'

/** Запас по ширине на кнопку "Ещё" (включая chevron и gap) */
const MORE_BUTTON_WIDTH = 80

export interface PriorityNavItem {
  href: string
  label: string
}

export interface PriorityNavProps {
  items: PriorityNavItem[]
  /** Определяет активный пункт. По умолчанию — точное совпадение pathname. */
  isActive?: (href: string) => boolean
  /** Текст кнопки overflow-меню. По умолчанию "Ещё". */
  moreLabel?: string
  gap?: number
}

export function PriorityNav({ items, isActive, moreLabel = 'Ещё', gap = 0.5 }: PriorityNavProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const widthsRef = useRef<number[]>([])
  // Стартуем с 0, чтобы первый рендер не показывал overflowing items
  const [visibleCount, setVisibleCount] = useState(0)
  const [measured, setMeasured] = useState(false)

  const recalc = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    const available = container.offsetWidth
    const widths = widthsRef.current
    if (widths.length === 0 || available === 0) {
      return
    }

    let used = 0
    let count = 0
    for (let i = 0; i < widths.length; i++) {
      const w = widths[i]
      if (w === undefined) {
        break
      }
      const isLast = i === widths.length - 1
      const budget = isLast ? available : available - MORE_BUTTON_WIDTH
      if (used + w <= budget) {
        used += w
        count++
      } else {
        break
      }
    }
    setVisibleCount(count)
    setMeasured(true)
  }, [])

  useLayoutEffect(() => {
    widthsRef.current = itemRefs.current.map((el) => (el ? el.offsetWidth : 0))
    recalc()
  }, [items, recalc])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') {
      return
    }
    const ro = new ResizeObserver(() => recalc())
    ro.observe(container)
    return () => ro.disconnect()
  }, [recalc])

  const visible = items.slice(0, visibleCount)
  const overflow = items.slice(visibleCount)
  const hasOverflow = overflow.length > 0
  const activeCheck = isActive ?? (() => false)

  return (
    <HStack
      ref={containerRef}
      gap={gap}
      minW={0}
      flex="1 1 auto"
      justify="center"
      position="relative"
      overflow="hidden"
      opacity={measured ? 1 : 0}
      transition="opacity 0.1s"
    >
      {/* Скрытый ряд для замера ширин каждого пункта */}
      <HStack gap={gap} position="absolute" visibility="hidden" pointerEvents="none" aria-hidden left={0} top={0}>
        {items.map((item, idx) => (
          <Box
            key={`ghost-${item.href}`}
            ref={(el: HTMLDivElement | null) => {
              itemRefs.current[idx] = el
            }}
            px={3}
            py={2}
            fontSize="sm"
            fontWeight="semibold"
            whiteSpace="nowrap"
          >
            {item.label}
          </Box>
        ))}
      </HStack>

      {visible.map((item) => {
        const active = activeCheck(item.href)
        return (
          <Link key={item.href} href={item.href}>
            <Box
              px={3}
              py={2}
              borderRadius="md"
              fontSize="sm"
              fontWeight={active ? 'semibold' : 'normal'}
              color={active ? 'brand.solid' : 'fg.muted'}
              _hover={{ color: active ? 'brand.solid' : 'fg', bg: 'bg.subtle' }}
              transition="all 0.15s"
              whiteSpace="nowrap"
            >
              {item.label}
            </Box>
          </Link>
        )
      })}

      {hasOverflow && (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Box
              px={3}
              py={2}
              borderRadius="md"
              fontSize="sm"
              color="fg.muted"
              _hover={{ color: 'fg', bg: 'bg.subtle' }}
              transition="all 0.15s"
              display="flex"
              alignItems="center"
              gap={1}
              cursor="pointer"
              whiteSpace="nowrap"
              asChild
            >
              <button type="button" aria-label={moreLabel}>
                {moreLabel}
                <LuChevronDown size={14} />
              </button>
            </Box>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content minW="180px">
                {overflow.map((item) => {
                  const active = activeCheck(item.href)
                  return (
                    <Menu.Item
                      key={item.href}
                      value={item.href}
                      asChild
                      fontWeight={active ? 'semibold' : 'normal'}
                      color={active ? 'brand.solid' : undefined}
                    >
                      <Link href={item.href}>{item.label}</Link>
                    </Menu.Item>
                  )
                })}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      )}
    </HStack>
  )
}

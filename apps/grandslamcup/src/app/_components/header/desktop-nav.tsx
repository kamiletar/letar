'use client'

/**
 * Priority Plus навигация: видимые пункты + дропдаун "Ещё" с тем что не влезло.
 * ResizeObserver замеряет контейнер и кешированные ширины пунктов, решает сколько показать.
 */

import { Box, HStack, Menu, Portal } from '@chakra-ui/react'
import { Pressable } from '@letar/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LuChevronDown } from 'react-icons/lu'

import type { NavItem } from './nav-config'

/** Запас по ширине на кнопку "Ещё" (включая chevron и gap) */
const MORE_BUTTON_WIDTH = 80

interface DesktopNavProps {
  navItems: NavItem[]
  cityPrefix: string
}

export function DesktopNav({ navItems, cityPrefix }: DesktopNavProps) {
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const widthsRef = useRef<number[]>([])
  // Стартуем с 0, чтобы первый рендер не показывал overflowing items
  const [visibleCount, setVisibleCount] = useState(0)
  const [measured, setMeasured] = useState(false)

  const isActiveLink = (href: string) =>
    href === '/' || href === cityPrefix ? pathname === href : pathname.startsWith(href)

  /** Пересчёт сколько пунктов влезает в контейнер */
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
      // Если это не последний пункт — резервируем место на кнопку "Ещё"
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

  // Замер ширин каждого пункта один раз после монтирования
  useLayoutEffect(() => {
    widthsRef.current = itemRefs.current.map((el) => (el ? el.offsetWidth : 0))
    recalc()
  }, [navItems, recalc])

  // ResizeObserver — пересчитываем при изменении ширины контейнера
  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') {
      return
    }
    const ro = new ResizeObserver(() => recalc())
    ro.observe(container)
    return () => ro.disconnect()
  }, [recalc])

  const visible = navItems.slice(0, visibleCount)
  const overflow = navItems.slice(visibleCount)
  const hasOverflow = overflow.length > 0

  return (
    <HStack
      ref={containerRef}
      gap={0.5}
      display={{ base: 'none', md: 'flex' }}
      minW={0}
      flex="1 1 auto"
      justify="center"
      position="relative"
      overflow="hidden"
      opacity={measured ? 1 : 0}
      transition="opacity 0.1s"
    >
      {/* Скрытый ряд для замера ширин каждого пункта */}
      <HStack gap={0.5} position="absolute" visibility="hidden" pointerEvents="none" aria-hidden left={0} top={0}>
        {navItems.map((item, idx) => (
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

      {/* Видимые пункты */}
      {visible.map((item) => {
        const isActive = isActiveLink(item.href)
        return (
          <Pressable key={item.href} borderRadius="md">
            <Link href={item.href}>
              <Box
                px={3}
                py={2}
                borderRadius="md"
                fontSize="sm"
                fontWeight={isActive ? 'semibold' : 'normal'}
                color={isActive ? 'brand.solid' : 'fg.muted'}
                _hover={{ color: isActive ? 'brand.solid' : 'fg', bg: 'bg.subtle' }}
                transitionProperty="color, background-color"
                transitionDuration="0.15s"
                position="relative"
                whiteSpace="nowrap"
              >
                {item.label}
                {isActive && (
                  <Box position="absolute" bottom={0} left={3} right={3} h="2px" bg="brand.solid" borderRadius="full" />
                )}
              </Box>
            </Link>
          </Pressable>
        )
      })}

      {/* Дропдаун "Ещё" для пунктов, которые не влезли */}
      {hasOverflow && (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Box
              px={3}
              py={2}
              borderRadius="md"
              fontSize="sm"
              fontWeight="normal"
              color="fg.muted"
              _hover={{ color: 'fg', bg: 'bg.subtle' }}
              transitionProperty="color, background-color"
              transitionDuration="0.15s"
              display="flex"
              alignItems="center"
              gap={1}
              cursor="pointer"
              whiteSpace="nowrap"
              asChild
            >
              <button type="button" aria-label="Ещё">
                Ещё
                <LuChevronDown size={14} />
              </button>
            </Box>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content minW="180px">
                {overflow.map((item) => {
                  const isActive = isActiveLink(item.href)
                  const Icon = item.icon
                  return (
                    <Menu.Item
                      key={item.href}
                      value={item.href}
                      asChild
                      fontWeight={isActive ? 'semibold' : 'normal'}
                      color={isActive ? 'brand.solid' : undefined}
                    >
                      <Link href={item.href}>
                        <Icon size={14} />
                        {item.label}
                      </Link>
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

'use client'

import { Box, Link, Text, VStack } from '@chakra-ui/react'
import { List } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TocItem } from './mdx-content'

type Props = {
  items: TocItem[]
  locale: string
}

/**
 * Навигация по заголовкам статьи (Table of Contents)
 * Sticky sidebar с подсветкой текущего раздела
 */
export function TableOfContents({ items, locale }: Props) {
  const [activeId, setActiveId] = useState<string>('')

  // Отслеживаем скролл для подсветки активного заголовка
  useEffect(() => {
    const headings = items.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[]

    if (headings.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Находим первый видимый заголовок
        const visibleEntry = entries.find((entry) => entry.isIntersecting)
        if (visibleEntry) {
          setActiveId(visibleEntry.target.id)
        }
      },
      {
        rootMargin: '-80px 0px -70% 0px',
        threshold: 0,
      },
    )

    headings.forEach((heading) => observer.observe(heading))

    return () => {
      headings.forEach((heading) => observer.unobserve(heading))
    }
  }, [items])

  if (items.length === 0) {
    return null
  }

  // Фильтруем только h2 и h3 для компактности
  const filteredItems = items.filter((item) => item.level >= 2 && item.level <= 3)

  if (filteredItems.length === 0) {
    return null
  }

  return (
    <Box
      as="nav"
      aria-label={locale === 'ru' ? 'Содержание статьи' : 'Table of contents'}
      position="sticky"
      top="100px"
      maxH="calc(100vh - 120px)"
      overflowY="auto"
      pr={4}
      css={{
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'var(--chakra-colors-gray-300)', borderRadius: '2px' },
      }}
    >
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <List size={16} />
        <Text fontWeight="semibold" fontSize="sm" color="gray.500">
          {locale === 'ru' ? 'Содержание' : 'Contents'}
        </Text>
      </Box>

      <VStack align="stretch" gap={0}>
        {filteredItems.map((item) => {
          const isActive = activeId === item.id
          const indent = (item.level - 2) * 12

          return (
            <Link
              key={item.id}
              href={`#${item.id}`}
              display="block"
              py={1.5}
              pl={`${indent + 12}px`}
              pr={2}
              fontSize="sm"
              lineHeight="short"
              color={isActive ? 'purple.600' : 'gray.600'}
              fontWeight={isActive ? 'medium' : 'normal'}
              borderLeft="2px solid"
              borderColor={isActive ? 'purple.500' : 'transparent'}
              bg={isActive ? { base: 'purple.50', _dark: 'purple.900/20' } : 'transparent'}
              _hover={{
                color: 'purple.600',
                bg: { base: 'gray.50', _dark: 'gray.800' },
              }}
              transitionProperty="color, border-color, background-color"
              transitionDuration="0.15s"
              textDecoration="none"
              onClick={(e) => {
                e.preventDefault()
                const element = document.getElementById(item.id)
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                  // Обновляем URL без перезагрузки
                  history.pushState(null, '', `#${item.id}`)
                }
              }}
            >
              <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={item.text}>
                {item.text}
              </Text>
            </Link>
          )
        })}
      </VStack>
    </Box>
  )
}

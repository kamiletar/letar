'use client'

import { Badge, Box, Flex, Text } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { SCROLL_MARGIN_TOP } from '@/lib/constants'
import { getCategoryFromPath, getDocumentBySlug } from '@/lib/documents'

import { BookmarkButton } from '../bookmark-button'

interface ArticleProps {
  /** Номер статьи (например: 1, "12-1", "3а") */
  number: number | string
  /** Текст статьи */
  children: ReactNode
}

/**
 * Компонент статьи закона.
 * Отображает номер статьи в Badge с красным акцентом и текст.
 * Имеет якорь для прямой ссылки и кнопку закладки.
 * Улучшена accessibility: role="article", aria-labelledby.
 */
export function Article({ number, children }: ArticleProps) {
  const id = `article-${number}`
  const labelId = `article-label-${number}`
  const pathname = usePathname()

  // Извлекаем slug из URL
  const parts = pathname.split('/').filter(Boolean)
  const slug = parts[parts.length - 1]

  // Используем единый реестр документов
  const doc = getDocumentBySlug(slug)
  const title = doc?.shortTitle || doc?.title || slug
  const category = getCategoryFromPath(pathname)

  const bookmark = {
    id: `${slug}-${number}`,
    title,
    articleNumber: String(number),
    href: `${pathname}#${id}`,
    category,
  }

  return (
    <Box
      id={id}
      position="relative"
      pl={{ base: 3, md: 5 }}
      pr={2}
      py={{ base: 2, md: 3 }}
      mb={{ base: 3, md: 4 }}
      borderLeftWidth="3px"
      borderLeftColor="brand.500"
      borderRadius="0 md md 0"
      bg="transparent"
      transition="all 0.2s ease"
      scrollMarginTop={SCROLL_MARGIN_TOP}
      className="article"
      role="article"
      aria-labelledby={labelId}
      css={{
        '&:hover': {
          backgroundColor: 'var(--chakra-colors-bg-subtle)',
        },
        '&:hover .bookmark-btn': {
          opacity: 1,
          transform: 'translateX(0)',
        },
        /* Широкий контент (pre, code) должен скроллиться, а не обрезаться */
        '& pre': {
          overflowX: 'auto',
          maxWidth: '100%',
        },
      }}
    >
      {/* Мобильный лейаут: Badge и закладка сверху */}
      <Flex display={{ base: 'flex', md: 'none' }} justify="space-between" align="center" mb={1}>
        <Badge
          id={labelId}
          colorPalette="red"
          variant="subtle"
          fontSize="xs"
          fontWeight="bold"
          px={2}
          py={0.5}
          borderRadius="md"
        >
          Ст. {number}
        </Badge>
        <BookmarkButton bookmark={bookmark} />
      </Flex>

      {/* Мобильный: только текст */}
      <Box display={{ base: 'block', md: 'none' }} lineHeight="tall">
        <Text as="span">{children}</Text>
      </Box>

      {/* Десктопный лейаут: Badge | Текст | Закладка в ряд */}
      <Flex display={{ base: 'none', md: 'flex' }} align="flex-start" gap={3}>
        <Badge
          id={`${labelId}-desktop`}
          colorPalette="red"
          variant="subtle"
          fontSize="xs"
          fontWeight="bold"
          px={2}
          py={0.5}
          borderRadius="md"
          flexShrink={0}
          whiteSpace="nowrap"
        >
          Ст. {number}
        </Badge>

        <Box flex="1" lineHeight="tall" minW={0}>
          <Text as="span">{children}</Text>
        </Box>

        <Box className="bookmark-btn" opacity={0} transform="translateX(8px)" transition="all 0.2s ease" flexShrink={0}>
          <BookmarkButton bookmark={bookmark} />
        </Box>
      </Flex>
    </Box>
  )
}

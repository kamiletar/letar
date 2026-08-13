'use client'

import { Badge, Box, Flex, Text } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
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

  // useMemo — стабильная ссылка на объект между рендерами документов с большим числом статей
  // (Конституция и кодексы — до сотни <Article> на странице). Без него BookmarkButton = memo(...)
  // не срабатывает: `bookmark` пересоздаётся как новый литерал на каждом рендере родителя,
  // shallow-сравнение memo всегда проваливается — все BookmarkButton на странице ре-рендерятся
  // синхронно при любом чужом обновлении состояния, увеличивая стоимость гидратации именно на
  // "тяжёлых" документах.
  const bookmark = useMemo(
    () => ({
      id: `${slug}-${number}`,
      title,
      articleNumber: String(number),
      href: `${pathname}#${id}`,
      category,
    }),
    [slug, number, title, pathname, id, category],
  )

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
      {
        /*
        Единственный рендер Badge/текста/кнопки закладки — раньше здесь было ДВА независимых
        Flex-блока (мобильный и десктопный), каждый со своей копией `{children}` и своим
        <BookmarkButton>, переключаемых через display:{base,md}. Оба оставались в DOM
        одновременно (просто один из них display:none), поэтому:
        - локатор `[aria-label="Добавить в закладки"]` матчил ДВА элемента на статью — `.first()`
          в e2e резолвился в скрытый (display:none) мобильный экземпляр → `toBeVisible()`
          падал / `.click()` таймаутился (apps/pravda-e2e/src/bookmarks.spec.ts);
        - вложенный <CrossRef> (и любой другой контент из `children`) дублировался в DOM —
          локатор без `.first()` на внутреннюю ссылку статьи ловил strict mode violation
          (apps/pravda-e2e/src/cross-refs.spec.ts, `a[href="#article-72"]`).
        Адаптивность (мобильный: Badge+закладка в одной строке, текст на следующей; десктоп: всё
        в одну строку) теперь достигается CSS-переносом (`wrap`) и `order`, без дублирования
        разметки.
      */
      }
      <Flex align="flex-start" gap={3} wrap={{ base: 'wrap', md: 'nowrap' }}>
        <Badge
          id={labelId}
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

        {/* На мобильных кнопка видна всегда (нет hover), на десктопе — по наведению на статью */}
        <Box
          className="bookmark-btn"
          order={{ base: 2, md: 3 }}
          ml="auto"
          flexShrink={0}
          opacity={{ base: 1, md: 0 }}
          transform={{ base: 'none', md: 'translateX(8px)' }}
          transition="all 0.2s ease"
        >
          <BookmarkButton bookmark={bookmark} />
        </Box>

        <Box flex="1" minW={0} lineHeight="tall" order={{ base: 3, md: 2 }}>
          <Text as="span">{children}</Text>
        </Box>
      </Flex>
    </Box>
  )
}

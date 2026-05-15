'use client'

import { HStack, Link, Text } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import { LuBookOpen } from 'react-icons/lu'

/** Маппинг pathname → URL статьи */
const ARTICLE_MAP: Record<string, { title: string; url: string }> = {
  '/examples/basic': {
    title: 'Статья 1 — Формы в React',
    url: 'https://forms.letar.best/docs/guides/getting-started',
  },
  '/examples/all-fields': {
    title: 'Статья 4 — 49 полей',
    url: 'https://forms.letar.best/docs/guides/all-fields',
  },
  '/examples/advanced-fields': {
    title: 'Статья 4 — 49 полей',
    url: 'https://forms.letar.best/docs/guides/all-fields',
  },
  '/examples/validation': {
    title: 'Статья 2 — Zod .meta()',
    url: 'https://forms.letar.best/docs/guides/validation',
  },
  '/examples/constraints': {
    title: 'Статья 2 — Zod .meta()',
    url: 'https://forms.letar.best/docs/guides/validation',
  },
  '/examples/conditional': {
    title: 'Статья 5 — Мультистеп и условный рендеринг',
    url: 'https://forms.letar.best/docs/guides/multi-step',
  },
  '/examples/multi-step': {
    title: 'Статья 5 — Мультистеп и условный рендеринг',
    url: 'https://forms.letar.best/docs/guides/multi-step',
  },
  '/examples/groups': {
    title: 'Статья 6 — Массивы и вложенные объекты',
    url: 'https://forms.letar.best/docs/guides/groups',
  },
  '/examples/auto-fields': {
    title: 'Статья 7 — FromSchema',
    url: 'https://forms.letar.best/docs/guides/auto-fields',
  },
  '/examples/auto-fields-advanced': {
    title: 'Статья 7 — FromSchema',
    url: 'https://forms.letar.best/docs/guides/auto-fields',
  },
  '/examples/zenstack': {
    title: 'Статья 8 — От БД до формы',
    url: 'https://forms.letar.best/docs/guides/zenstack',
  },
  '/examples/recipes': {
    title: 'Серия статей @letar/forms',
    url: 'https://forms.letar.best/docs/guides',
  },
  '/examples/theming': {
    title: 'Статья 3 — Compound Components',
    url: 'https://forms.letar.best/docs/guides/compound-components',
  },
  '/examples/persistence': {
    title: 'Статья 9 — Offline-first',
    url: 'https://forms.letar.best/docs/guides/offline',
  },
  '/examples/i18n': {
    title: 'Статья 10 — i18n',
    url: 'https://forms.letar.best/docs/guides/i18n',
  },
  '/examples/offline': {
    title: 'Статья 9 — Offline-first',
    url: 'https://forms.letar.best/docs/guides/offline',
  },
}

/** Ссылка на статью, соответствующую текущей example-странице */
export function ArticleLink() {
  const pathname = usePathname()
  const article = ARTICLE_MAP[pathname]

  if (!article) {
    return null
  }

  return (
    <Link
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      color="fg.muted"
      _hover={{ color: 'fg' }}
      fontSize="sm"
    >
      <HStack gap={1.5}>
        <LuBookOpen />
        <Text>Read the article</Text>
      </HStack>
    </Link>
  )
}

'use client'

import { Fragment } from 'react'

import { Breadcrumb } from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'

import { findDocumentByHref, navData } from './sidebar/nav-data'

/**
 * Хлебные крошки для навигации.
 * Строятся автоматически из текущего пути.
 */
export function Breadcrumbs() {
  const pathname = usePathname()

  // Разбираем путь на сегменты
  const segments = pathname.split('/').filter(Boolean)

  // Если мы на главной — не показываем
  if (segments.length === 0) {
    return null
  }

  // Строим крошки
  const crumbs: { title: string; href: string }[] = [{ title: 'Главная', href: '/' }]

  // Находим категорию
  const firstSegment = `/${segments[0]}`
  const category = navData.find((section) => section.items.some((item) => item.href.startsWith(firstSegment)))

  if (category && segments.length > 0) {
    // Категория (кодексы, уставы, регламенты)
    const categorySlug = segments[0]
    const categoryTitle = getCategoryTitle(categorySlug)
    if (categoryTitle && segments.length > 1) {
      crumbs.push({ title: categoryTitle, href: `/${categorySlug}` })
    }
  }

  // Находим документ
  const doc = findDocumentByHref(pathname)
  if (doc) {
    crumbs.push({ title: doc.title, href: doc.href })
  } else if (segments.length === 1) {
    // Одиночный документ (конституция, правда)
    const singleDoc = findDocumentByHref(pathname)
    if (singleDoc) {
      crumbs.push({ title: singleDoc.title, href: singleDoc.href })
    }
  }

  return (
    <Breadcrumb.Root as="nav" aria-label="Навигационная цепочка" mb={4} fontSize="sm">
      <Breadcrumb.List>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <Fragment key={crumb.href}>
              <Breadcrumb.Item>
                {isLast
                  ? (
                    <Breadcrumb.CurrentLink color="fg.default" fontWeight="medium">
                      {crumb.title}
                    </Breadcrumb.CurrentLink>
                  )
                  : (
                    <Breadcrumb.Link asChild color="fg.muted" _hover={{ color: 'brand.600' }}>
                      <NextLink href={crumb.href}>{crumb.title}</NextLink>
                    </Breadcrumb.Link>
                  )}
              </Breadcrumb.Item>
              {!isLast && <Breadcrumb.Separator />}
            </Fragment>
          )
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  )
}

function getCategoryTitle(slug: string): string | null {
  const titles: Record<string, string> = {
    кодексы: 'Кодексы',
    уставы: 'Уставы',
    регламенты: 'Регламенты',
  }
  return titles[slug] || null
}

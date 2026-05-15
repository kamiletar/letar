'use client'

import { Breadcrumb, Link, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { Fragment } from 'react'
import { LuChevronRight, LuHouse } from 'react-icons/lu'

interface BreadcrumbItem {
  /** Текст крошки */
  label: string
  /** URL для навигации (не указывается для последнего элемента) */
  href?: string
}

interface BreadcrumbsProps {
  /** Массив элементов хлебных крошек */
  items: BreadcrumbItem[]
}

/**
 * Хлебные крошки для навигации по глубоким маршрутам.
 *
 * @example
 * ```tsx
 * <Breadcrumbs items={[
 *   { label: 'Каталог', href: '/anime' },
 *   { label: 'Naruto' },
 * ]} />
 * ```
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <Breadcrumb.Root
      fontSize="sm"
      overflowX="auto"
      css={{ '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}
    >
      <Breadcrumb.List whiteSpace="nowrap" flexWrap="nowrap">
        {/* Иконка дома → Главная */}
        <Breadcrumb.Item>
          <Breadcrumb.Link asChild>
            <Link asChild color="fg.muted" _hover={{ color: 'fg' }}>
              <NextLink href="/">
                <LuHouse />
              </NextLink>
            </Link>
          </Breadcrumb.Link>
        </Breadcrumb.Item>

        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <Fragment key={item.label}>
              <Breadcrumb.Separator>
                <LuChevronRight />
              </Breadcrumb.Separator>
              <Breadcrumb.Item>
                {isLast || !item.href ? (
                  <Text color="fg">{item.label}</Text>
                ) : (
                  <Breadcrumb.Link asChild>
                    <Link asChild color="fg.muted" _hover={{ color: 'fg' }}>
                      <NextLink href={item.href}>{item.label}</NextLink>
                    </Link>
                  </Breadcrumb.Link>
                )}
              </Breadcrumb.Item>
            </Fragment>
          )
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  )
}

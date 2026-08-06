'use client'

import { Link } from '@/i18n/navigation'
import { Breadcrumb, Icon } from '@chakra-ui/react'
import { ChevronRight, Home } from 'lucide-react'
import { Fragment } from 'react'

interface BreadcrumbItem {
  /** Текст ссылки */
  label: string
  /** URL (если не указан — текущая страница) */
  href?: string
}

interface BreadcrumbsProps {
  /** Элементы хлебных крошек */
  items: BreadcrumbItem[]
}

/**
 * Компонент хлебных крошек для навигации внутри разделов
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <Breadcrumb.Root mb={4}>
      <Breadcrumb.List>
        {/* Домашняя страница */}
        <Breadcrumb.Item>
          <Breadcrumb.Link asChild>
            <Link href="/" aria-label="Home">
              <Icon boxSize={4} color="fg.muted" _hover={{ color: 'fg' }} transition="color 0.2s">
                <Home />
              </Icon>
            </Link>
          </Breadcrumb.Link>
        </Breadcrumb.Item>

        {/* Остальные элементы */}
        {items.map((item) => (
          <Fragment key={item.href ?? item.label}>
            <Breadcrumb.Separator>
              <Icon color="fg.muted" boxSize={3}>
                <ChevronRight />
              </Icon>
            </Breadcrumb.Separator>
            <Breadcrumb.Item>
              {item.href
                ? (
                  <Breadcrumb.Link
                    asChild
                    color="fg.muted"
                    fontSize="sm"
                    _hover={{ color: 'fg.500' }}
                    transition="color 0.2s"
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Breadcrumb.Link>
                )
                : (
                  <Breadcrumb.CurrentLink fontSize="sm" color="fg" fontWeight="medium">
                    {item.label}
                  </Breadcrumb.CurrentLink>
                )}
            </Breadcrumb.Item>
          </Fragment>
        ))}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  )
}

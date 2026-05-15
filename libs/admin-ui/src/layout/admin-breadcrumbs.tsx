'use client'

import { Breadcrumb, Link, Text } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import { LuChevronRight, LuHouse } from 'react-icons/lu'

interface AdminBreadcrumbsProps {
  /** Маппинг сегментов пути на человекочитаемые названия */
  pathNames?: Record<string, string>
  /** Базовый URL админ-панели (по умолчанию '/admin') */
  baseUrl?: string
}

/** Дефолтные названия сегментов */
const DEFAULT_PATH_NAMES: Record<string, string> = {
  admin: 'Админ',
  new: 'Создание',
  edit: 'Редактирование',
}

/**
 * Хлебные крошки для админ-панели
 *
 * Автоматически строит навигационную цепочку на основе текущего URL.
 * UUID в пути заменяются на "Детали".
 *
 * @example
 * ```tsx
 * // /admin/products/123/edit
 * // -> Админ > Товары > Детали > Редактирование
 *
 * <AdminBreadcrumbs pathNames={{ products: 'Товары' }} />
 * ```
 */
export function AdminBreadcrumbs({ pathNames = {}, baseUrl = '/admin' }: AdminBreadcrumbsProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // Объединяем дефолтные и пользовательские названия
  const allPathNames = { ...DEFAULT_PATH_NAMES, ...pathNames }

  // Не показываем на главной админки
  if (segments.length <= 1) {
    return null
  }

  // Строим массив крошек
  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1

    // Проверяем, является ли сегмент UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    // Или CUID
    const isCUID = /^c[a-z0-9]{24}$/i.test(segment)

    let label: string
    if (isUUID || isCUID) {
      label = 'Детали'
    } else {
      label = allPathNames[segment] || segment
    }

    return { href, label, isLast }
  })

  return (
    <Breadcrumb.Root mb={4} fontSize="sm">
      <Breadcrumb.List>
        {/* Иконка дома для Dashboard */}
        <Breadcrumb.Item>
          <Breadcrumb.Link asChild>
            <Link href={baseUrl} color="fg.muted" _hover={{ color: 'fg' }}>
              <LuHouse />
            </Link>
          </Breadcrumb.Link>
        </Breadcrumb.Item>

        {crumbs.slice(1).map((crumb) => (
          <Fragment key={crumb.href}>
            <Breadcrumb.Separator>
              <LuChevronRight />
            </Breadcrumb.Separator>
            <Breadcrumb.Item>
              {crumb.isLast ? (
                <Text color="fg">{crumb.label}</Text>
              ) : (
                <Breadcrumb.Link asChild>
                  <Link href={crumb.href} color="fg.muted" _hover={{ color: 'fg' }}>
                    {crumb.label}
                  </Link>
                </Breadcrumb.Link>
              )}
            </Breadcrumb.Item>
          </Fragment>
        ))}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  )
}

/* oxlint-disable no-array-index-key */
'use client'

import { BreadcrumbCurrentLink, BreadcrumbLink, BreadcrumbRoot } from '@/app/_components/ui/breadcrumb'
import { Box } from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { LuChevronRight } from 'react-icons/lu'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  /** Кастомные breadcrumbs items (опционально) */
  items?: BreadcrumbItem[]
  /** Показывать ли breadcrumbs на мобильных устройствах */
  showOnMobile?: boolean
}

// Маппинг путей на читаемые названия
const pathLabels: Record<string, string> = {
  dashboard: 'Панель управления',
  profile: 'Профиль',
  'my-profile': 'Мой профиль',
  diagnostics: 'Диагностика',
  plan: 'План трансформации',
  practices: 'Практики',
  progress: 'Прогресс',
  clients: 'Клиенты',
  sessions: 'Сессии',
  plans: 'Планы',
  analytics: 'Аналитика',
  users: 'Пользователи',
  specialists: 'Специалисты',
  settings: 'Настройки',
  edit: 'Редактирование',
  new: 'Создание',
}

/**
 * Компонент breadcrumbs (хлебные крошки)
 * Автоматически генерирует breadcrumbs из текущего пути или использует кастомные items
 */
export function Breadcrumbs({ items, showOnMobile = false }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Если переданы кастомные items, используем их
  if (items) {
    return (
      <Box display={showOnMobile ? 'block' : { base: 'none', md: 'block' }}>
        <BreadcrumbRoot separator={<LuChevronRight />} size="sm">
          {/* oxlint-disable-next-line no-array-index-key */}
          {items.map((item, index) => {
            const isLast = index === items.length - 1

            if (isLast || !item.href) {
              return <BreadcrumbCurrentLink key={index}>{item.label}</BreadcrumbCurrentLink>
            }

            return (
              <BreadcrumbLink key={index} asChild>
                <NextLink href={item.href}>{item.label}</NextLink>
              </BreadcrumbLink>
            )
          })}
        </BreadcrumbRoot>
      </Box>
    )
  }

  // Автоматическая генерация из pathname
  const segments = pathname.split('/').filter(Boolean)

  // Если только главная страница, не показываем breadcrumbs
  if (segments.length === 0) {
    return null
  }

  // Если только dashboard, не показываем breadcrumbs (он уже в header)
  if (segments.length === 1 && segments[0] === 'dashboard') {
    return null
  }

  // Генерируем breadcrumb items
  const generatedItems: BreadcrumbItem[] = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const label = pathLabels[segment] || decodeURIComponent(segment)

    return { label, href }
  })

  // Добавляем Dashboard в начало, если его нет
  if (generatedItems[0]?.label !== pathLabels.dashboard) {
    generatedItems.unshift({
      label: pathLabels.dashboard,
      href: '/dashboard',
    })
  }

  return (
    <Box display={showOnMobile ? 'block' : { base: 'none', md: 'block' }}>
      <BreadcrumbRoot separator={<LuChevronRight />} size="sm">
        {/* oxlint-disable-next-line no-array-index-key */}
        {generatedItems.map((item, index) => {
          const isLast = index === generatedItems.length - 1

          if (isLast) {
            return <BreadcrumbCurrentLink key={index}>{item.label}</BreadcrumbCurrentLink>
          }

          return (
            <BreadcrumbLink key={index} asChild>
              <NextLink href={item.href!}>{item.label}</NextLink>
            </BreadcrumbLink>
          )
        })}
      </BreadcrumbRoot>
    </Box>
  )
}

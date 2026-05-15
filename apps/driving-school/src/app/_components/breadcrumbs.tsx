/**
 * Компонент навигационных хлебных крошек
 *
 * Автоматически генерирует breadcrumbs из URL или принимает кастомные элементы.
 * Поддерживает автоматическую локализацию сегментов пути.
 *
 * @module breadcrumbs
 */

'use client'

import React from 'react'

import { Breadcrumb, Icon, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { LuChevronRight, LuHouse } from 'react-icons/lu'

// === Типы ===

export interface BreadcrumbItem {
  /** Текст для отображения */
  label: string
  /** Ссылка (если нет — текущий элемент) */
  href?: string
  /** Иконка (опционально) */
  icon?: React.ElementType
}

export interface BreadcrumbsProps {
  /** Кастомные элементы (если не указаны — автогенерация из URL) */
  items?: BreadcrumbItem[]
  /** Показывать иконку дома */
  showHomeIcon?: boolean
  /** Базовый путь для главной */
  homePath?: string
  /** Название главной страницы */
  homeLabel?: string
  /** Не показывать последний элемент как ссылку */
  currentAsText?: boolean
}

// === Локализация сегментов пути ===

const pathLabels: Record<string, string> = {
  // Общие
  dashboard: 'Личный кабинет',
  profile: 'Профиль',
  settings: 'Настройки',
  chats: 'Чаты',

  // Owner панель
  owner: 'Админ-панель',
  users: 'Пользователи',
  schools: 'Автошколы',
  tickets: 'Обращения',
  support: 'Поддержка',
  legal: 'Юр. документы',
  plans: 'Тарифы',
  'rate-limits': 'API лимиты',
  'api-logs': 'Логи API',
  audit: 'Аудит',
  finances: 'Финансы',

  // Инструктор
  instructor: 'Инструктор',
  students: 'Ученики',
  lessons: 'Занятия',
  schedule: 'Расписание',
  stats: 'Статистика',
  reviews: 'Отзывы',
  vehicles: 'Транспорт',
  'lesson-types': 'Типы занятий',
  'theory-lessons': 'Теория',
  exams: 'Экзамены',
  'enrollment-requests': 'Заявки',
  invite: 'Приглашение',

  // Ученик
  student: 'Ученик',
  'my-lessons': 'Мои занятия',
  'my-schedule': 'Моё расписание',
  progress: 'Прогресс',
  instructors: 'Инструкторы',
  balance: 'Баланс',

  // Школа
  school: 'Школа',

  // Действия
  new: 'Создание',
  edit: 'Редактирование',
  create: 'Создание',
  pricing: 'Цены',
  attendance: 'Посещаемость',
  results: 'Результаты',
  success: 'Успех',
}

// === Хелпер для получения label из сегмента ===

function getSegmentLabel(segment: string): string {
  // Если есть в словаре — используем
  if (pathLabels[segment]) {
    return pathLabels[segment]
  }

  // UUID или ID — пропускаем или показываем кратко
  if (segment.match(/^[a-f0-9-]{36}$/i) || segment.match(/^[a-z0-9]{20,}$/i)) {
    return '...'
  }

  // Числовой ID
  if (/^\d+$/.test(segment)) {
    return `#${segment}`
  }

  // Капитализация для неизвестных сегментов
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// === Компонент ===

export function Breadcrumbs({
  items,
  showHomeIcon = true,
  homePath = '/dashboard',
  homeLabel = 'Главная',
  currentAsText = true,
}: BreadcrumbsProps) {
  const pathname = usePathname()

  // Автогенерация breadcrumbs из URL
  const breadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
    // Если переданы кастомные элементы — используем их
    if (items) {
      return items
    }

    // Разбиваем путь на сегменты
    const segments = pathname.split('/').filter(Boolean)

    // Если мы на главной — не показываем breadcrumbs
    if (segments.length === 0 || pathname === homePath) {
      return []
    }

    // Генерируем элементы
    const result: BreadcrumbItem[] = []

    // Добавляем главную
    result.push({
      label: homeLabel,
      href: homePath,
      icon: showHomeIcon ? LuHouse : undefined,
    })

    // Добавляем остальные сегменты
    let currentPath = ''
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      currentPath += `/${segment}`

      // Пропускаем групповые сегменты в скобках (auth), (owner) и т.д.
      if (segment.startsWith('(') && segment.endsWith(')')) {
        continue
      }

      const isLast = i === segments.length - 1
      const label = getSegmentLabel(segment)

      // Пропускаем сегменты которые выглядят как ID и не последние
      if (label === '...' && !isLast) {
        continue
      }

      result.push({
        label,
        href: isLast && currentAsText ? undefined : currentPath,
      })
    }

    return result
  }, [items, pathname, homePath, homeLabel, showHomeIcon, currentAsText])

  // Если только один элемент (главная) — не показываем
  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <Breadcrumb.Root size="sm">
      <Breadcrumb.List>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1

          return (
            <React.Fragment key={item.href || item.label}>
              <Breadcrumb.Item>
                {item.href ? (
                  <Breadcrumb.Link asChild>
                    <Link href={item.href}>
                      {item.icon && <Icon as={item.icon} boxSize={4} mr={1} />}
                      {item.label}
                    </Link>
                  </Breadcrumb.Link>
                ) : (
                  <Breadcrumb.CurrentLink>
                    <Text color={isLast ? 'fg' : 'fg.muted'} fontWeight={isLast ? 'medium' : 'normal'}>
                      {item.icon && <Icon as={item.icon} boxSize={4} mr={1} />}
                      {item.label}
                    </Text>
                  </Breadcrumb.CurrentLink>
                )}
              </Breadcrumb.Item>
              {!isLast && (
                <Breadcrumb.Separator>
                  <Icon color="fg.muted" boxSize={3}>
                    <LuChevronRight />
                  </Icon>
                </Breadcrumb.Separator>
              )}
            </React.Fragment>
          )
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  )
}

// === Обёртка для использования в layout ===

export interface BreadcrumbsWrapperProps {
  /** Переопределить автогенерируемые элементы */
  items?: BreadcrumbItem[]
  /** Дополнительные CSS классы */
  className?: string
}

export function BreadcrumbsWrapper({ items, className }: BreadcrumbsWrapperProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <Breadcrumbs items={items} />
    </nav>
  )
}

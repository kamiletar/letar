import type { UserRole } from '@/generated/prisma'
import type { IconType } from 'react-icons'
import {
  LuCalendar,
  LuChartBar,
  LuClipboardList,
  LuDumbbell,
  LuFileText,
  LuLayoutDashboard,
  LuSettings,
  LuTarget,
  LuTrendingUp,
  LuUser,
  LuUserCog,
  LuUsers,
} from 'react-icons/lu'

export interface NavLink {
  label: string
  href: string
  icon: IconType
  badge?: number // Для уведомлений
  children?: NavLink[]
}

export interface NavConfig {
  CLIENT: NavLink[]
  SPECIALIST: NavLink[]
  ADMIN: NavLink[]
}

// Конфигурация навигации для CLIENT (Клиент)
const clientLinks: NavLink[] = [
  {
    label: 'Панель управления',
    href: '/dashboard',
    icon: LuLayoutDashboard,
  },
  {
    label: 'Мой профиль',
    href: '/my-profile',
    icon: LuUser,
  },
  {
    label: 'Диагностика',
    href: '/diagnostics',
    icon: LuClipboardList,
  },
  {
    label: 'План трансформации',
    href: '/plan',
    icon: LuTarget,
  },
  {
    label: 'Практики',
    href: '/practices',
    icon: LuDumbbell,
  },
  {
    label: 'Прогресс',
    href: '/progress',
    icon: LuTrendingUp,
  },
  {
    label: 'Настройки',
    href: '/profile/edit',
    icon: LuSettings,
  },
]

// Конфигурация навигации для SPECIALIST (Специалист)
const specialistLinks: NavLink[] = [
  {
    label: 'Панель управления',
    href: '/dashboard',
    icon: LuLayoutDashboard,
  },
  {
    label: 'Профиль',
    href: '/profile',
    icon: LuUser,
  },
  {
    label: 'Клиенты',
    href: '/clients',
    icon: LuUsers,
  },
  {
    label: 'Сессии',
    href: '/sessions',
    icon: LuCalendar,
  },
  {
    label: 'Планы трансформации',
    href: '/plans',
    icon: LuFileText,
  },
  {
    label: 'Аналитика',
    href: '/analytics',
    icon: LuChartBar,
  },
  {
    label: 'Настройки',
    href: '/profile/edit',
    icon: LuSettings,
  },
]

// Конфигурация навигации для ADMIN (Администратор)
const adminLinks: NavLink[] = [
  {
    label: 'Панель управления',
    href: '/dashboard',
    icon: LuLayoutDashboard,
  },
  {
    label: 'Профиль',
    href: '/profile',
    icon: LuUser,
  },
  {
    label: 'Пользователи',
    href: '/users',
    icon: LuUsers,
  },
  {
    label: 'Специалисты',
    href: '/specialists',
    icon: LuUserCog,
  },
  {
    label: 'Аналитика',
    href: '/analytics',
    icon: LuChartBar,
  },
  {
    label: 'Настройки системы',
    href: '/settings',
    icon: LuSettings,
  },
  {
    label: 'Мои настройки',
    href: '/profile/edit',
    icon: LuUser,
  },
]

// Экспорт конфигурации навигации для каждой роли
export const navigationConfig: NavConfig = {
  CLIENT: clientLinks,
  SPECIALIST: specialistLinks,
  ADMIN: adminLinks,
}

// Хелпер для получения ссылок по роли
export function getNavigationLinks(role: UserRole): NavLink[] {
  return navigationConfig[role] || []
}

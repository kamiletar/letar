import type { ReactNode } from 'react'
import {
  FaBuilding,
  FaClipboardList,
  FaCog,
  FaCut,
  FaEdit,
  FaGem,
  FaHeart,
  FaHistory,
  FaLink,
  FaLock,
  FaMapMarkerAlt,
  FaRuler,
  FaUser,
} from 'react-icons/fa'

export interface NavItem {
  href: string
  label: string
  icon: ReactNode
}

export const profileNavItems: NavItem[] = [
  {
    href: '/profile',
    label: 'Обзор',
    icon: <FaUser />,
  },
  {
    href: '/profile/orders',
    label: 'Заказы',
    icon: <FaClipboardList />,
  },
  {
    href: '/profile/custom-orders',
    label: 'Специальные заказы',
    icon: <FaCut />,
  },
  {
    href: '/profile/loyalty',
    label: 'Бонусы',
    icon: <FaGem />,
  },
  {
    href: '/profile/wishlist',
    label: 'Избранное',
    icon: <FaHeart />,
  },
  {
    href: '/profile/recently-viewed',
    label: 'Просмотренные',
    icon: <FaHistory />,
  },
  {
    href: '/profile/measurements',
    label: 'Мои размеры',
    icon: <FaRuler />,
  },
  {
    href: '/profile/addresses',
    label: 'Адреса',
    icon: <FaMapMarkerAlt />,
  },
  {
    href: '/profile/company',
    label: 'Профиль компании',
    icon: <FaBuilding />,
  },
  {
    href: '/profile/edit',
    label: 'Редактирование',
    icon: <FaEdit />,
  },
  {
    href: '/profile/connected-accounts',
    label: 'Связанные аккаунты',
    icon: <FaLink />,
  },
  {
    href: '/profile/change-password',
    label: 'Сменить пароль',
    icon: <FaLock />,
  },
  {
    href: '/profile/settings',
    label: 'Настройки',
    icon: <FaCog />,
  },
]

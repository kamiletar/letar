import type { ReactNode } from 'react'
import { FiBox, FiDollarSign, FiHome, FiRotateCcw, FiSettings, FiShoppingCart, FiStar } from 'react-icons/fi'

export interface SellerNavItem {
  href: string
  label: string
  icon: ReactNode
}

export const sellerNavItems: SellerNavItem[] = [
  {
    href: '/seller',
    label: 'Обзор',
    icon: <FiHome />,
  },
  {
    href: '/seller/products',
    label: 'Товары',
    icon: <FiBox />,
  },
  {
    href: '/seller/orders',
    label: 'Заказы',
    icon: <FiShoppingCart />,
  },
  {
    href: '/seller/reviews',
    label: 'Отзывы',
    icon: <FiStar />,
  },
  {
    href: '/seller/returns',
    label: 'Возвраты',
    icon: <FiRotateCcw />,
  },
  {
    href: '/seller/finances',
    label: 'Финансы',
    icon: <FiDollarSign />,
  },
  {
    href: '/seller/settings',
    label: 'Настройки',
    icon: <FiSettings />,
  },
]

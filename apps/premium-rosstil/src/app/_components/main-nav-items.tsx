import type { ReactNode } from 'react'
import { MdCollections, MdHome, MdInfo, MdPhone, MdShoppingBag } from 'react-icons/md'

export interface MainNavItem {
  href: string
  label: string
  icon: ReactNode
}

export const mainNavItems: MainNavItem[] = [
  {
    href: '/',
    label: 'Главная',
    icon: <MdHome />,
  },
  {
    href: '/catalog',
    label: 'Каталог',
    icon: <MdShoppingBag />,
  },
  {
    href: '/collections',
    label: 'Коллекции',
    icon: <MdCollections />,
  },
  {
    href: '/about',
    label: 'О Бренде',
    icon: <MdInfo />,
  },
  {
    href: '/contacts',
    label: 'Контакты',
    icon: <MdPhone />,
  },
]

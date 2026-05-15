import type { AdminNavItem } from '@letar/admin-ui'
import { LuFileText, LuHouse, LuImage, LuMail, LuPackage, LuSettings, LuShoppingBag } from 'react-icons/lu'

/**
 * Пункты навигации админ-панели.
 * Используется в AdminSidebar и MobileAdminDrawer.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LuHouse },
  { href: '/admin/mandalas', label: 'Мандалы', icon: LuImage },
  { href: '/admin/products', label: 'Товары', icon: LuShoppingBag },
  { href: '/admin/orders', label: 'Заказы', icon: LuPackage },
  { href: '/admin/content-pages', label: 'Страницы', icon: LuFileText },
  { href: '/admin/contacts', label: 'Сообщения', icon: LuMail },
  { href: '/admin/settings', label: 'Настройки', icon: LuSettings },
]

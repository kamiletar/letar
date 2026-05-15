'use client'

import { AdminSidebar, MobileAdminDrawer } from '@letar/admin-ui'
import { ADMIN_NAV_ITEMS } from '../_constants/navigation'

interface AdminNavClientProps {
  userEmail?: string | null
  onLogout: () => Promise<void>
}

/**
 * Клиентский wrapper для навигации админ-панели.
 * Решает проблему RSC: иконки (функции) нельзя передавать из Server Component в Client Component.
 * Вместо этого navItems определяются целиком на клиенте.
 */
export function AdminSidebarClient({ userEmail, onLogout }: AdminNavClientProps) {
  return <AdminSidebar navItems={ADMIN_NAV_ITEMS} userEmail={userEmail} onLogout={onLogout} />
}

export function MobileAdminDrawerClient({ userEmail, onLogout }: AdminNavClientProps) {
  return <MobileAdminDrawer navItems={ADMIN_NAV_ITEMS} userEmail={userEmail} onLogout={onLogout} />
}

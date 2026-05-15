/**
 * Типы и константы для dashboard
 *
 * @module dashboard.types
 */

/** Получение русского названия роли */
export function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    USER: 'Пользователь',
    FREELANCE_INSTRUCTOR: 'Инструктор',
    MODERATOR: 'Модератор',
    OWNER: 'Владелец платформы',
  }
  return roleNames[role] || role
}

/** Названия ролей школы */
export const roleLabels: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
}

/** Props для карточки дашборда */
export interface DashboardCardProps {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}

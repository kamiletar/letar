/**
 * Типы аутентификации для IMOT
 * Вынесены в отдельный файл чтобы избежать импорта better-auth в клиентских компонентах
 */

/**
 * Расширенный тип пользователя с кастомными полями
 * Better Auth добавляет additionalFields в user, но TypeScript не знает о них автоматически
 */
export interface UserWithRole {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
  // Кастомные поля из additionalFields
  role: 'CLIENT' | 'SPECIALIST' | 'ADMIN'
  phoneNumber?: string | null
  emailNotifications?: boolean
  notifySessionReminders?: boolean
  notifyNewPractices?: boolean
  notifyPracticeDiary?: boolean
}

export interface SessionWithRole {
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    ipAddress?: string | null
    userAgent?: string | null
    createdAt: Date
    updatedAt: Date
  }
  user: UserWithRole
}

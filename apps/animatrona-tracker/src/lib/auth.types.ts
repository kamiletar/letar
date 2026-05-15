/**
 * Типы аутентификации для Animatrona Tracker
 * Вынесены в отдельный файл чтобы избежать импорта better-auth в клиентских компонентах
 */

/**
 * Расширенный тип пользователя с кастомными полями
 */
export interface UserWithRole {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
  // Кастомные поля
  role: 'USER' | 'MODERATOR' | 'ADMIN'
  customGateway?: string | null
  birthDate?: Date | null
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

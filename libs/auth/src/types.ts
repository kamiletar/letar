import type React from 'react'

/**
 * Базовые типы для Better Auth
 *
 * Эти типы можно расширять в каждом приложении
 * для добавления специфичных полей (role, phoneNumber и т.д.)
 */

/**
 * Базовая сессия Better Auth
 */
export interface SessionBase {
  id: string
  userId: string
  token: string
  expiresAt: Date
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Базовый пользователь Better Auth
 */
export interface UserBase {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Базовая сессия с пользователем
 */
export interface SessionWithUserBase {
  session: SessionBase
  user: UserBase
}

/**
 * Пользователь с ролью (расширяемый тип)
 *
 * @example
 * ```typescript
 * // В приложении
 * type UserRole = 'USER' | 'ADMIN'
 * type AppUser = UserWithRole<UserRole>
 * ```
 */
export interface UserWithRole<TRole extends string = string> extends UserBase {
  role: TRole
}

/**
 * Сессия с пользователем с ролью
 */
export interface SessionWithRole<TRole extends string = string> {
  session: SessionBase
  user: UserWithRole<TRole>
}

/**
 * Базовый тип Account для OAuth провайдеров
 *
 * Используется в ConnectedAccountsList для отображения связанных аккаунтов
 */
export interface AccountBase {
  /** ID провайдера (google, yandex, vk, telegram и т.д.) */
  providerId: string
  /** ID аккаунта в системе провайдера */
  accountId: string
  /** Дата создания связи */
  createdAt: Date
}

/**
 * Конфигурация отображения провайдера
 *
 * Используется для настройки ConnectedAccountsList
 */
export interface ProviderDisplayConfig {
  /** Название провайдера для отображения */
  name: string
  /** React компонент иконки */
  icon: React.ComponentType
  /** Цвет для colorPalette (Chakra UI) */
  color: string
}

/**
 * Результат операции отвязки аккаунта
 */
export interface UnlinkAccountResult {
  /** Успешность операции */
  success: boolean
  /** Сообщение об ошибке (если success=false) */
  error?: string
}

/**
 * Строка списка Tier2 self-service OAuth-провайдеров (SocialProvidersSettings)
 */
export interface SocialProviderRow {
  id: string
  /** ID провайдера ('google', 'vk', 'yandex' и т.д. — приложение решает какие показывать) */
  providerId: string
  clientId: string
  enabled: boolean
  createdAt: Date
}

/**
 * Данные формы создания/редактирования Tier2 OAuth-провайдера
 */
export interface SocialProviderInput {
  providerId: string
  clientId: string
  /** Пусто при редактировании = оставить текущий секрет без изменений */
  clientSecret?: string
  enabled?: boolean
}

/**
 * Результат server action создания/обновления Tier2 OAuth-провайдера
 */
export type SocialProviderActionResult = { data: null } | { error: string }

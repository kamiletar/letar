/**
 * Dashboard User Role
 *
 * USER — по умолчанию, нет доступа к дашборду (только выход)
 * VIEWER — просмотр дашборда
 * ADMIN — полный доступ + управление
 */
export type UserRole = 'USER' | 'VIEWER' | 'ADMIN'

/**
 * Dashboard User (из Better Auth + PostgreSQL)
 */
export interface DashboardUser {
  id: string
  username: string
  role: UserRole
  email?: string
  name?: string | null
  image?: string | null
  emailVerified?: boolean
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Dashboard Session (из Better Auth)
 */
export interface DashboardSession {
  user: DashboardUser
  session: {
    id: string
    userId: string
    expiresAt: Date
    token: string
  }
}

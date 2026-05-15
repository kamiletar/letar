import type { StatusFilter } from './constants'

/**
 * Типы для api-logs компонентов
 */

/** Организация для фильтрации */
export interface Organization {
  id: string
  name: string
}

/** Props для главного компонента */
export interface ApiLogsInfiniteProps {
  organizations: Organization[]
}

/** API лог с загруженными связями */
export interface ApiLogWithRelations {
  id: string
  createdAt: Date
  method: string
  endpoint: string
  statusCode: number
  responseTimeMs: number
  ipAddress: string | null
  userAgent: string | null
  apiKeyId: string
  organizationId: string
  apiKey: {
    id: string
    name: string
    keyPrefix: string
  } | null
  organization: {
    id: string
    name: string
  } | null
}

/** Состояние фильтров */
export interface ApiLogsFiltersState {
  organizationFilter: string
  endpointFilter: string
  statusFilter: StatusFilter
}

/** Действия фильтров */
export interface ApiLogsFiltersActions {
  setOrganizationFilter: (value: string) => void
  setEndpointFilter: (value: string) => void
  setStatusFilter: (value: StatusFilter) => void
}

'use client'

import { useMemo, useState } from 'react'

import type { StatusFilter } from './constants'
import type { ApiLogsFiltersActions, ApiLogsFiltersState } from './types'

/**
 * Хук для управления фильтрами API-логов
 */
export function useApiLogsFilters(): ApiLogsFiltersState &
  ApiLogsFiltersActions & {
    whereConditions: Record<string, unknown>
  } {
  const [organizationFilter, setOrganizationFilter] = useState('')
  const [endpointFilter, setEndpointFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Построение условий where на основе фильтров
  const whereConditions = useMemo(() => {
    const where: Record<string, unknown> = {}

    // Фильтр по организации
    if (organizationFilter) {
      where.organizationId = organizationFilter
    }

    // Фильтр по endpoint
    if (endpointFilter && endpointFilter.trim() !== '') {
      where.endpoint = { contains: endpointFilter, mode: 'insensitive' }
    }

    // Фильтр по статусу
    if (statusFilter === 'success') {
      where.statusCode = { gte: 200, lt: 300 }
    } else if (statusFilter === 'error') {
      where.statusCode = { gte: 400 }
    }

    return where
  }, [organizationFilter, endpointFilter, statusFilter])

  return {
    organizationFilter,
    endpointFilter,
    statusFilter,
    setOrganizationFilter,
    setEndpointFilter,
    setStatusFilter,
    whereConditions,
  }
}

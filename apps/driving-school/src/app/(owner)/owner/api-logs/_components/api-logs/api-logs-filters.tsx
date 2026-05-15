'use client'

import { Field } from '@/app/_components/ui/field'
import { NativeSelectField, NativeSelectRoot } from '@/app/_components/ui/native-select'
import { Card, Input, Stack } from '@chakra-ui/react'

import type { StatusFilter } from './constants'
import type { Organization } from './types'

interface ApiLogsFiltersProps {
  organizations: Organization[]
  organizationFilter: string
  endpointFilter: string
  statusFilter: StatusFilter
  onOrganizationChange: (value: string) => void
  onEndpointChange: (value: string) => void
  onStatusChange: (value: StatusFilter) => void
}

/**
 * Компонент фильтров для API-логов
 */
export function ApiLogsFilters({
  organizations,
  organizationFilter,
  endpointFilter,
  statusFilter,
  onOrganizationChange,
  onEndpointChange,
  onStatusChange,
}: ApiLogsFiltersProps) {
  return (
    <Card.Root>
      <Card.Body>
        <Stack direction={{ base: 'column', md: 'row' }} gap={4}>
          {/* Фильтр по организации */}
          <Field label="Организация">
            <NativeSelectRoot size="sm">
              <NativeSelectField value={organizationFilter} onChange={(e) => onOrganizationChange(e.target.value)}>
                <option value="">Все организации</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </NativeSelectField>
            </NativeSelectRoot>
          </Field>

          {/* Фильтр по endpoint */}
          <Field label="Endpoint">
            <Input
              size="sm"
              placeholder="Поиск по endpoint"
              value={endpointFilter}
              onChange={(e) => onEndpointChange(e.target.value)}
            />
          </Field>

          {/* Фильтр по статусу */}
          <Field label="Статус">
            <NativeSelectRoot size="sm">
              <NativeSelectField value={statusFilter} onChange={(e) => onStatusChange(e.target.value as StatusFilter)}>
                <option value="all">Все</option>
                <option value="success">Успешные (2xx)</option>
                <option value="error">Ошибки (4xx, 5xx)</option>
              </NativeSelectField>
            </NativeSelectRoot>
          </Field>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

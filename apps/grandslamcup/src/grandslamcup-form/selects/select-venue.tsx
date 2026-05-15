'use client'

/**
 * Select для выбора площадки.
 * Загружает список площадок через API.
 */

import { FieldSelect, type SelectOption } from '@letar/forms'
import { useQuery } from '@tanstack/react-query'
import type { ReactElement } from 'react'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  /** Очищаемый (для необязательных полей) */
  clearable?: boolean
}

/** Select площадки с автозагрузкой списка */
export function SelectVenue({ name, ...props }: Props): ReactElement {
  const { data: venues = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['admin', 'venues'],
    queryFn: () => fetch('/api/admin/venues').then((r) => r.json()),
  })

  const options: SelectOption<string>[] = venues.map((v) => ({
    label: v.name,
    value: v.id,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

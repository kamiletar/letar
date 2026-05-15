'use client'

/**
 * Select для выбора города.
 * Загружает список городов через API.
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
}

/** Select города с автозагрузкой списка */
export function SelectCity({ name, ...props }: Props): ReactElement {
  const { data: cities = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['admin', 'cities'],
    queryFn: () => fetch('/api/admin/cities').then((r) => r.json()),
  })

  const options: SelectOption<string>[] = cities.map((c) => ({
    label: c.name,
    value: c.id,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

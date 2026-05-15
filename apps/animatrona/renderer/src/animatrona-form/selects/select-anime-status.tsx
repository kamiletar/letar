'use client'

import type { AnimeStatus } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { animeStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Показать опцию "Все статусы" */
  showAll?: boolean
}

const allStatuses: AnimeStatus[] = ['ONGOING', 'COMPLETED', 'ANNOUNCED']

/**
 * Select для статуса аниме
 */
export function SelectAnimeStatus({ name, showAll, ...props }: Props): ReactElement {
  const options: SelectOption<AnimeStatus | ''>[] = [
    ...(showAll ? [{ label: 'Все статусы', value: '' as AnimeStatus }] : []),
    ...allStatuses.map((value) => ({
      label: animeStatusLabels[value],
      value,
    })),
  ]

  return <FieldSelect name={name} options={options} {...props} />
}

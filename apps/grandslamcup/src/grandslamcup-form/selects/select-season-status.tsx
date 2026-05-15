'use client'

import type { SeasonStatus } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { seasonStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

const allValues: SeasonStatus[] = ['UPCOMING', 'ACTIVE', 'FINISHED']

/** Select для статуса сезона */
export function SelectSeasonStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<SeasonStatus>[] = allValues.map((value) => ({
    label: seasonStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

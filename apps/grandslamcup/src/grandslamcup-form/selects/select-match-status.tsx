'use client'

import type { MatchStatus } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { matchStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

const allValues: MatchStatus[] = ['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED']

/** Select для статуса матча */
export function SelectMatchStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<MatchStatus>[] = allValues.map((value) => ({
    label: matchStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

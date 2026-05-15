'use client'

import type { TournamentFormat } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { tournamentFormatLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

const allValues: TournamentFormat[] = ['ROUND_ROBIN', 'SWISS']

/** Select для формата турнира */
export function SelectTournamentFormat({ name, ...props }: Props): ReactElement {
  const options: SelectOption<TournamentFormat>[] = allValues.map((value) => ({
    label: tournamentFormatLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

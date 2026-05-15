'use client'

import type { SeasonType } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { seasonTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Показать опцию "Все типы" */
  showAll?: boolean
}

const allTypes: SeasonType[] = ['TV', 'OVA', 'ONA', 'MOVIE', 'SPECIAL']

/**
 * Select для типа сезона (TV, OVA, Movie и т.д.)
 */
export function SelectSeasonType({ name, showAll, ...props }: Props): ReactElement {
  const options: SelectOption<SeasonType | ''>[] = [
    ...(showAll ? [{ label: 'Все типы', value: '' as SeasonType }] : []),
    ...allTypes.map((value) => ({
      label: seasonTypeLabels[value],
      value,
    })),
  ]

  return <FieldSelect name={name} options={options} {...props} />
}

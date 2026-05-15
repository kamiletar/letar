'use client'

import type { Tune } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { tuneLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: Tune[] = ['NONE', 'HQ', 'UHQ', 'ULL', 'LL']

/**
 * Select для Tune профиля кодирования
 */
export function SelectTune({ name, ...props }: Props): ReactElement {
  const options: SelectOption<Tune>[] = allValues.map((value) => ({
    label: tuneLabels[value],
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

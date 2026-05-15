'use client'

import type { Multipass } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { multipassLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: Multipass[] = ['DISABLED', 'QRES', 'FULLRES']

/**
 * Select для Multipass профиля кодирования
 */
export function SelectMultipass({ name, ...props }: Props): ReactElement {
  const options: SelectOption<Multipass>[] = allValues.map((value) => ({
    label: multipassLabels[value],
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

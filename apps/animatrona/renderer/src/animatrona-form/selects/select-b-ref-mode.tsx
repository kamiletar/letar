'use client'

import type { BRefMode } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { bRefModeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: BRefMode[] = ['DISABLED', 'EACH', 'MIDDLE']

/**
 * Select для B-Ref Mode профиля кодирования
 */
export function SelectBRefMode({ name, ...props }: Props): ReactElement {
  const options: SelectOption<BRefMode>[] = allValues.map((value) => ({
    label: bRefModeLabels[value],
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

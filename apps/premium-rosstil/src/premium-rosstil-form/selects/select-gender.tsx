'use client'

import type { Gender } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { genderLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: Gender[] = ['MALE', 'FEMALE']

export function SelectGender({ name, ...props }: Props): ReactElement {
  const options: SelectOption<Gender>[] = allValues.map((value) => ({
    label: genderLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

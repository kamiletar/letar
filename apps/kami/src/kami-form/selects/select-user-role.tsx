'use client'

import type { UserRole } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { UserRoleLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: UserRole[] = ['USER', 'ADMIN']

export function SelectUserRole({ name, ...props }: Props): ReactElement {
  const options: SelectOption<UserRole>[] = allValues.map((value) => ({
    label: UserRoleLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

'use client'

import type { UserRole } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { userRoleLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: UserRole[] = ['USER', 'FREELANCE_INSTRUCTOR', 'MODERATOR', 'OWNER']

export function SelectUserRole({ name, ...props }: Props): ReactElement {
  const options: SelectOption<UserRole>[] = allValues.map((value) => ({
    label: userRoleLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

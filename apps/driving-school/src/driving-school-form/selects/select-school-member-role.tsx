'use client'

import { roleLabels } from '@/lib/permissions'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'

/** Тип роли участника школы (lowercase строки из Better Auth) */
type SchoolMemberRole = keyof typeof roleLabels

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: SchoolMemberRole[] = ['owner', 'super_manager', 'manager', 'instructor', 'theory_instructor', 'member']

export function SelectSchoolMemberRole({ name, ...props }: Props): ReactElement {
  const options: SelectOption<SchoolMemberRole>[] = allValues.map((value) => ({
    label: roleLabels[value],
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

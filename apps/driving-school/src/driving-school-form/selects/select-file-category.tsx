'use client'

import type { FileCategory } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { fileCategoryLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: FileCategory[] = [
  'LOCATION',
  'AVATAR',
  'INSTRUCTOR_PHOTO',
  'DOCUMENT',
  'VEHICLE',
  'CHAT_ATTACHMENT',
  'THEORY_MATERIAL',
]

export function SelectFileCategory({ name, ...props }: Props): ReactElement {
  const options: SelectOption<FileCategory>[] = allValues.map((value) => ({
    label: fileCategoryLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

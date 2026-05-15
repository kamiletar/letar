'use client'

import type { ChatType } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { chatTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ChatType[] = [
  'PRIVATE',
  'SCHOOL',
  'INSTRUCTORS',
  'STUDENTS',
  'GENERAL',
  'STUDY_GROUP',
  'INSTRUCTOR_STUDENTS',
]

export function SelectChatType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ChatType>[] = allValues.map((value) => ({
    label: chatTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

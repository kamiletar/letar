'use client'

import type { LessonCategory } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { lessonCategoryLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: LessonCategory[] = [
  'STANDARD',
  'PARKING',
  'MANEUVERING',
  'DEFENSIVE_DRIVING',
  'DRIFT',
  'CITY_DRIVING',
  'HIGHWAY_DRIVING',
  'NIGHT_DRIVING',
  'CUSTOM',
]

export function SelectLessonCategory({ name, ...props }: Props): ReactElement {
  const options: SelectOption<LessonCategory>[] = allValues.map((value) => ({
    label: lessonCategoryLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

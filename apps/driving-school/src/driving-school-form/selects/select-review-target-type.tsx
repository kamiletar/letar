'use client'

import type { ReviewTargetType } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { reviewTargetTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ReviewTargetType[] = ['INSTRUCTOR', 'SCHOOL']

export function SelectReviewTargetType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ReviewTargetType>[] = allValues.map((value) => ({
    label: reviewTargetTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

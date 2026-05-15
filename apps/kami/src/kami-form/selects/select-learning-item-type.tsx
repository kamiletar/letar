'use client'

import type { LearningItemType } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { LearningItemTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: LearningItemType[] = ['BOOK', 'COURSE', 'ARTICLE', 'VIDEO', 'PODCAST', 'CONFERENCE', 'OTHER']

export function SelectLearningItemType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<LearningItemType>[] = allValues.map((value) => ({
    label: LearningItemTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

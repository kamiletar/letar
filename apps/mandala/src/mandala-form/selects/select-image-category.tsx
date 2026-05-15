'use client'

import type { ImageCategory } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { imageCategoryLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ImageCategory[] = ['MANDALA', 'PRODUCT', 'CONTENT', 'OTHER']

export function SelectImageCategory({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ImageCategory>[] = allValues.map((value) => ({
    label: imageCategoryLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

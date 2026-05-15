'use client'

import type { ColorType } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { colorTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ColorType[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER']

export function SelectColorType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ColorType>[] = allValues.map((value) => ({
    label: colorTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

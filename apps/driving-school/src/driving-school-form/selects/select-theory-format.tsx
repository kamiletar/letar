'use client'

import type { TheoryFormat } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { theoryFormatLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: TheoryFormat[] = ['CLASSROOM', 'DISTANCE', 'ONLINE', 'HYBRID']

export function SelectTheoryFormat({ name, ...props }: Props): ReactElement {
  const options: SelectOption<TheoryFormat>[] = allValues.map((value) => ({
    label: theoryFormatLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

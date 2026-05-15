'use client'

import type { ChakraType } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { chakraTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ChakraType[] = ['ROOT', 'SACRAL', 'SOLAR_PLEXUS', 'HEART', 'THROAT', 'THIRD_EYE', 'CROWN']

export function SelectChakraType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ChakraType>[] = allValues.map((value) => ({
    label: chakraTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

'use client'

import type { Archetype } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { archetypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: Archetype[] = [
  'INNOCENT',
  'EVERYMAN',
  'HERO',
  'OUTLAW',
  'EXPLORER',
  'CREATOR',
  'RULER',
  'MAGICIAN',
  'LOVER',
  'CAREGIVER',
  'JESTER',
  'SAGE',
]

export function SelectArchetype({ name, ...props }: Props): ReactElement {
  const options: SelectOption<Archetype>[] = allValues.map((value) => ({
    label: archetypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

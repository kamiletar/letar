'use client'

import type { PersonalDataChangeType } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { personalDataChangeTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: PersonalDataChangeType[] = ['ADDRESS', 'PASSPORT', 'NAME']

export function SelectPersonalDataChangeType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<PersonalDataChangeType>[] = allValues.map((value) => ({
    label: personalDataChangeTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

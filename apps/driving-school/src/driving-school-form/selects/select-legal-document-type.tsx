'use client'

import type { LegalDocumentType } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { legalDocumentTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: LegalDocumentType[] = ['OFFER', 'PRIVACY_POLICY']

export function SelectLegalDocumentType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<LegalDocumentType>[] = allValues.map((value) => ({
    label: legalDocumentTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

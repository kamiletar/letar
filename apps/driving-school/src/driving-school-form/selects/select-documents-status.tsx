'use client'

import type { DocumentsStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { documentsStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: DocumentsStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'READY']

export function SelectDocumentsStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<DocumentsStatus>[] = allValues.map((value) => ({
    label: documentsStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

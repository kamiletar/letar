'use client'

import type { ApiKeyStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { apiKeyStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ApiKeyStatus[] = ['ACTIVE', 'REVOKED']

export function SelectApiKeyStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ApiKeyStatus>[] = allValues.map((value) => ({
    label: apiKeyStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

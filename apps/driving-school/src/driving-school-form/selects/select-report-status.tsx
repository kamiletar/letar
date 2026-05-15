'use client'

import type { ReportStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { reportStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ReportStatus[] = ['PENDING', 'RESOLVED', 'DISMISSED']

export function SelectReportStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ReportStatus>[] = allValues.map((value) => ({
    label: reportStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

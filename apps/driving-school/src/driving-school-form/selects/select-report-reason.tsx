'use client'

import type { ReportReason } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { reportReasonLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ReportReason[] = ['SPAM', 'OFFENSIVE', 'FALSE_INFO', 'NOT_RELEVANT', 'OTHER']

export function SelectReportReason({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ReportReason>[] = allValues.map((value) => ({
    label: reportReasonLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

'use client'

import type { TransformationStage } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { transformationStageLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: TransformationStage[] = ['DIAGNOSTICS', 'INTEGRATION', 'STRATEGY', 'PRACTICE', 'RESULT']

export function SelectTransformationStage({ name, ...props }: Props): ReactElement {
  const options: SelectOption<TransformationStage>[] = allValues.map((value) => ({
    label: transformationStageLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

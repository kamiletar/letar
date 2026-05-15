'use client'

import {
  SurveyQuestionTypeLabels,
  type SurveyQuestionTypeValue,
} from '@/generated/form-schemas/enums/SurveyQuestionType.form'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: SurveyQuestionTypeValue[] = ['TEXT', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'RATING', 'SCALE']

export function SelectSurveyQuestionType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<SurveyQuestionTypeValue>[] = allValues.map((value) => ({
    label: SurveyQuestionTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

'use client'

import type { StudyGroupSchedule } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { studyGroupScheduleLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: StudyGroupSchedule[] = ['MORNING', 'EVENING', 'WEEKEND']

export function SelectStudyGroupSchedule({ name, ...props }: Props): ReactElement {
  const options: SelectOption<StudyGroupSchedule>[] = allValues.map((value) => ({
    label: studyGroupScheduleLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

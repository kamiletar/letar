'use client'

import type { TrackPreference } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { trackPreferenceLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allPreferences: TrackPreference[] = ['RUSSIAN_DUB', 'ORIGINAL_SUB', 'AUTO']

/**
 * Select для предпочтения дорожек (русская озвучка / оригинал с субтитрами / авто)
 */
export function SelectTrackPreference({ name, ...props }: Props): ReactElement {
  const options: SelectOption<TrackPreference>[] = allPreferences.map((value) => ({
    label: trackPreferenceLabels[value],
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}

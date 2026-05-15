'use client'

import { NativeSelectField, NativeSelectRoot } from '@/app/_components/ui/native-select'
import { SessionStatusLabels } from '@/generated/form-schemas'

export interface StatusSelectProps {
  name: string
  defaultValue?: string
}

/**
 * Компонент выбора статуса сессии.
 */
export function StatusSelect({ name, defaultValue = 'SCHEDULED' }: StatusSelectProps) {
  return (
    <NativeSelectRoot>
      <NativeSelectField name={name} defaultValue={defaultValue}>
        {Object.entries(SessionStatusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelectField>
    </NativeSelectRoot>
  )
}

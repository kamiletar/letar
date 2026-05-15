'use client'

import { TransformationStageLabels } from '@/generated/form-schemas'
import { TransformationStage } from '@/generated/prisma'
import { NativeSelectField, NativeSelectRoot } from '@chakra-ui/react'

interface StageSelectProps {
  name: string
  defaultValue?: string
}

/**
 * Компонент селектора этапа трансформации.
 */
export function StageSelect({ name, defaultValue }: StageSelectProps) {
  return (
    <NativeSelectRoot>
      <NativeSelectField name={name} defaultValue={defaultValue || TransformationStage.DIAGNOSTICS}>
        {Object.entries(TransformationStageLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelectField>
    </NativeSelectRoot>
  )
}

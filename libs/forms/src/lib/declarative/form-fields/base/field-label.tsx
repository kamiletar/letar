'use client'

import { Field, HStack } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import type { FieldTooltipMeta } from '../../types'
import { FieldTooltip } from './field-tooltip'

export interface FieldLabelProps {
  /** Label text (can be ReactNode for complex labels with links) */
  label?: ReactNode
  /** Tooltip for hint next to label */
  tooltip?: FieldTooltipMeta
  /** Show required field indicator */
  required?: boolean
}

/**
 * Label component for form fields with tooltip support.
 *
 * If tooltip is provided, renders HStack with label and hint icon.
 * Otherwise renders a simple Field.Label.
 *
 * @example
 * ```tsx
 * // Simple label
 * <FieldLabel label="Title" required />
 *
 * // Label with tooltip
 * <FieldLabel
 *   label="Car Brand"
 *   tooltip={{ description: 'Specify the brand', example: 'Hyundai' }}
 *   required
 * />
 * ```
 */
export function FieldLabel({ label, tooltip, required }: FieldLabelProps): ReactElement | null {
  if (!label) {
    return null
  }

  return (
    <Field.Label>
      {tooltip ? (
        <HStack gap={1}>
          <span>{label}</span>
          <FieldTooltip {...tooltip} />
        </HStack>
      ) : (
        label
      )}
      {required && <Field.RequiredIndicator />}
    </Field.Label>
  )
}

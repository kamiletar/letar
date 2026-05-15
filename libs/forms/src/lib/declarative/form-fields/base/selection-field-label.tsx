'use client'

import { Field, HStack } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import type { FieldTooltipMeta } from '../../types'
import { FieldTooltip } from './field-tooltip'

/**
 * Props for SelectionFieldLabel
 */
export interface SelectionFieldLabelProps {
  /** Label text */
  label: ReactNode
  /** Data for tooltip hint */
  tooltip?: FieldTooltipMeta
  /** Show required field indicator */
  required?: boolean
}

/**
 * Unified label for selection fields (Select, Combobox, Listbox, Autocomplete).
 * Avoids duplicating the HStack + FieldTooltip pattern across 12+ files.
 *
 * @example
 * ```tsx
 * <Select.Label>
 *   <SelectionFieldLabel
 *     label={resolved.label}
 *     tooltip={resolved.tooltip}
 *     required={resolved.required}
 *   />
 * </Select.Label>
 * ```
 */
export function SelectionFieldLabel({ label, tooltip, required }: SelectionFieldLabelProps): ReactElement {
  return (
    <>
      {tooltip ? (
        <HStack gap={1}>
          <span>{label}</span>
          <FieldTooltip {...tooltip} />
        </HStack>
      ) : (
        label
      )}
      {required && <Field.RequiredIndicator />}
    </>
  )
}

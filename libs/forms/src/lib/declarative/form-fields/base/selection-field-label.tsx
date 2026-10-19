'use client'

import { Field, Flex } from '@chakra-ui/react'
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
  // Собственный inline-flex с gap: у Select/Combobox/Tags/ColorPicker Label — block (у Field.Label — flex с gap),
  // а у Field.Select внешняя подпись уже flex. Отступ внутри обёртки не зависит от родителя и не удваивается.
  return (
    <Flex asChild display="inline-flex" alignItems="center" gap={1}>
      <span>
        {tooltip
          ? (
            <>
              <span>{label}</span>
              <FieldTooltip {...tooltip} />
            </>
          )
          : label}
        {required && <Field.RequiredIndicator />}
      </span>
    </Flex>
  )
}

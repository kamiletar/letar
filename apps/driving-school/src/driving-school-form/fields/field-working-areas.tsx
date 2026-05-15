'use client'

import { type WorkingArea, WorkingAreasInput } from '@/app/_components/working-areas-input'
import { Field, HStack } from '@chakra-ui/react'
import type { AnyFieldApi } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'

// Импорт из публичного API
import { FieldTooltip, type FieldTooltipMeta, useDeclarativeForm, useFormGroup } from '@letar/forms'

export interface WorkingAreasFieldProps {
  name?: string
  label?: ReactNode
  helperText?: ReactNode
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  /** Tooltip metadata for the field label */
  tooltip?: FieldTooltipMeta
  /** Max number of cities allowed */
  maxCities?: number
}

/**
 * Form.Field.WorkingAreas - Поле выбора рабочих зон инструктора
 *
 * Позволяет выбирать города и районы, где инструктор проводит занятия.
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Field.WorkingAreas
 *   name="pricing.workingAreas"
 *   label="Районы работы"
 *   maxCities={5}
 * />
 * ```
 */
export function FieldWorkingAreas({
  name,
  label = 'Районы работы',
  helperText,
  required,
  disabled,
  readOnly,
  tooltip,
  maxCities = 5,
}: WorkingAreasFieldProps): ReactElement {
  const { form } = useDeclarativeForm()
  const groupContext = useFormGroup()

  // Определяем полный путь к полю
  const fullPath = name ? (groupContext?.name ? `${groupContext.name}.${name}` : name) : (groupContext?.name ?? '')

  return (
    <form.Field name={fullPath}>
      {(field: AnyFieldApi) => {
        const errors = field.state.meta.errors
        const hasError = errors && errors.length > 0

        const handleChange = (areas: WorkingArea[]) => {
          field.handleChange(areas)
        }

        return (
          <Field.Root invalid={hasError} required={required} disabled={disabled} readOnly={readOnly}>
            {label && (
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
            )}
            <WorkingAreasInput
              value={(field.state.value as WorkingArea[]) ?? []}
              onChange={handleChange}
              maxCities={maxCities}
              disabled={disabled}
            />
            {hasError ? (
              <Field.ErrorText>{errors.map((e: { message?: string }) => e?.message ?? e).join(', ')}</Field.ErrorText>
            ) : (
              helperText && <Field.HelperText>{helperText}</Field.HelperText>
            )}
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

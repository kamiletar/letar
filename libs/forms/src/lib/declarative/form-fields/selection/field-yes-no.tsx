'use client'

import { Box, Field, HStack, Text } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { useFormGroup } from '../../../form-group'
import { useDeclarativeForm } from '../../form-context'
import type { BaseFieldProps } from '../../types'
import { FieldError, FieldLabel } from '../base'
import { formatFieldErrors, hasFieldErrors } from '../base/field-utils'
import { useResolvedFieldProps } from '../base/use-resolved-field-props'

/** Props для Form.Field.YesNo */
export interface YesNoFieldProps extends BaseFieldProps {
  /** Текст кнопки "Да" */
  yesLabel?: string
  /** Текст кнопки "Нет" */
  noLabel?: string
  /** Визуальный вариант */
  variant?: 'buttons' | 'thumbs' | 'emoji'
}

/** Контент для разных вариантов */
const VARIANT_CONTENT = {
  buttons: { yes: null, no: null },
  thumbs: { yes: '👍', no: '👎' },
  emoji: { yes: '😊', no: '😞' },
}

/**
 * Form.Field.YesNo — поле да/нет с большими кнопками.
 *
 * Два кликабельных блока для бинарного выбора. Подходит для согласий,
 * подтверждений, простых опросов.
 *
 * @example
 * ```tsx
 * <Form.Field.YesNo
 *   name="agree"
 *   label="Вы согласны с условиями?"
 *   yesLabel="Да, согласен"
 *   noLabel="Нет, отказываюсь"
 *   variant="buttons"
 * />
 * ```
 *
 * **Значение:** `boolean`
 */
export function FieldYesNo({
  name,
  label,
  helperText,
  required,
  disabled,
  readOnly,
  yesLabel = 'Да',
  noLabel = 'Нет',
  variant = 'buttons',
}: YesNoFieldProps): ReactElement {
  const { form } = useDeclarativeForm()
  useFormGroup()
  const {
    fullPath,
    label: resolvedLabel,
    helperText: resolvedHelperText,
    required: resolvedRequired,
    disabled: resolvedDisabled,
    readOnly: resolvedReadOnly,
  } = useResolvedFieldProps(name, { label, helperText, required, disabled, readOnly })

  const icons = VARIANT_CONTENT[variant]

  return (
    <form.Field name={fullPath}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(field: any) => {
        const errors = field.state.meta.errors
        const hasError = hasFieldErrors(errors)
        const value = field.state.value as boolean | undefined

        const handleSelect = (val: boolean) => {
          if (resolvedDisabled || resolvedReadOnly) return
          field.handleChange(val)
        }

        return (
          <Field.Root invalid={hasError}>
            {resolvedLabel && <FieldLabel label={resolvedLabel} required={resolvedRequired} />}

            <HStack gap={3}>
              {/* Кнопка "Да" */}
              <Box
                flex={1}
                p={4}
                borderWidth="2px"
                borderColor={value === true ? 'green.500' : 'border'}
                borderRadius="lg"
                cursor={resolvedDisabled ? 'default' : 'pointer'}
                onClick={() => handleSelect(true)}
                bg={value === true ? 'green.50' : 'transparent'}
                _dark={value === true ? { bg: 'green.900/20' } : undefined}
                _hover={resolvedDisabled ? undefined : { borderColor: 'green.400', shadow: 'sm' }}
                transition="all 0.2s"
                textAlign="center"
                opacity={resolvedDisabled ? 0.5 : 1}
                role="radio"
                aria-checked={value === true}
              >
                {icons.yes && (
                  <Text fontSize="2xl" mb={1}>
                    {icons.yes}
                  </Text>
                )}
                <Text fontWeight="medium" color={value === true ? 'green.600' : 'fg'}>
                  {yesLabel}
                </Text>
              </Box>

              {/* Кнопка "Нет" */}
              <Box
                flex={1}
                p={4}
                borderWidth="2px"
                borderColor={value === false ? 'red.500' : 'border'}
                borderRadius="lg"
                cursor={resolvedDisabled ? 'default' : 'pointer'}
                onClick={() => handleSelect(false)}
                bg={value === false ? 'red.50' : 'transparent'}
                _dark={value === false ? { bg: 'red.900/20' } : undefined}
                _hover={resolvedDisabled ? undefined : { borderColor: 'red.400', shadow: 'sm' }}
                transition="all 0.2s"
                textAlign="center"
                opacity={resolvedDisabled ? 0.5 : 1}
                role="radio"
                aria-checked={value === false}
              >
                {icons.no && (
                  <Text fontSize="2xl" mb={1}>
                    {icons.no}
                  </Text>
                )}
                <Text fontWeight="medium" color={value === false ? 'red.600' : 'fg'}>
                  {noLabel}
                </Text>
              </Box>
            </HStack>

            <FieldError hasError={hasError} errorMessage={formatFieldErrors(errors)} helperText={resolvedHelperText} />
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

'use client'

import { Box, Field, Image, SimpleGrid, Text } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { useFormGroup } from '../../../form-group'
import { useDeclarativeForm } from '../../form-context'
import type { BaseFieldProps } from '../../types'
import { FieldError, FieldLabel } from '../base'
import { formatFieldErrors, hasFieldErrors } from '../base/field-utils'
import { useResolvedFieldProps } from '../base/use-resolved-field-props'

/** Опция для ImageChoice */
export interface ImageChoiceOption {
  value: string
  label: string
  image: string
  /** Описание под label */
  description?: string
}

/** Props для Form.Field.ImageChoice */
export interface ImageChoiceFieldProps extends BaseFieldProps {
  /** Опции с картинками */
  options: ImageChoiceOption[]
  /** Количество колонок (responsive: base=1, sm=2, md=columns) */
  columns?: number
  /** Множественный выбор */
  multiple?: boolean
}

/**
 * Form.Field.ImageChoice — выбор из картинок.
 *
 * Grid карточек с изображениями для визуального выбора (стили, продукты, категории).
 *
 * @example
 * ```tsx
 * <Form.Field.ImageChoice
 *   name="style"
 *   options={[
 *     { value: 'modern', label: 'Современный', image: '/styles/modern.jpg' },
 *     { value: 'classic', label: 'Классический', image: '/styles/classic.jpg' },
 *   ]}
 *   columns={3}
 * />
 * ```
 */
export function FieldImageChoice({
  name,
  label,
  helperText,
  required,
  disabled,
  readOnly,
  options,
  columns = 3,
  multiple = false,
}: ImageChoiceFieldProps): ReactElement {
  const { form } = useDeclarativeForm()
  useFormGroup() // Контекст группы (доступен через хук при необходимости)
  const {
    fullPath,
    label: resolvedLabel,
    helperText: resolvedHelperText,
    required: resolvedRequired,
    disabled: resolvedDisabled,
    readOnly: resolvedReadOnly,
  } = useResolvedFieldProps(name, { label, helperText, required, disabled, readOnly })

  return (
    <form.Field name={fullPath}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(field: any) => {
        const errors = field.state.meta.errors
        const hasError = hasFieldErrors(errors)
        const value = field.state.value

        const isSelected = (optValue: string): boolean => {
          if (multiple) {
            return Array.isArray(value) && value.includes(optValue)
          }
          return value === optValue
        }

        const handleSelect = (optValue: string) => {
          if (resolvedDisabled || resolvedReadOnly) return

          if (multiple) {
            const current = Array.isArray(value) ? value : []
            const next = current.includes(optValue)
              ? current.filter((v: string) => v !== optValue)
              : [...current, optValue]
            field.handleChange(next)
          } else {
            field.handleChange(optValue)
          }
        }

        return (
          <Field.Root invalid={hasError}>
            {resolvedLabel && <FieldLabel label={resolvedLabel} required={resolvedRequired} />}

            <SimpleGrid columns={{ base: 1, sm: 2, md: columns }} gap={3}>
              {options.map((opt) => {
                const selected = isSelected(opt.value)
                return (
                  <Box
                    key={opt.value}
                    borderWidth="2px"
                    borderColor={selected ? 'blue.500' : 'border'}
                    borderRadius="lg"
                    overflow="hidden"
                    cursor={resolvedDisabled ? 'default' : 'pointer'}
                    onClick={() => handleSelect(opt.value)}
                    transition="all 0.2s"
                    _hover={resolvedDisabled ? undefined : { borderColor: 'blue.400', shadow: 'md' }}
                    opacity={resolvedDisabled ? 0.5 : 1}
                    position="relative"
                  >
                    <Image src={opt.image} alt={opt.label} w="100%" h="120px" objectFit="cover" />
                    {/* Галочка выбора */}
                    {selected && (
                      <Box
                        position="absolute"
                        top="8px"
                        right="8px"
                        bg="blue.500"
                        color="white"
                        borderRadius="full"
                        w="24px"
                        h="24px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="sm"
                        fontWeight="bold"
                      >
                        ✓
                      </Box>
                    )}
                    <Box p={2}>
                      <Text fontSize="sm" fontWeight="medium">
                        {opt.label}
                      </Text>
                      {opt.description && (
                        <Text fontSize="xs" color="fg.muted">
                          {opt.description}
                        </Text>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </SimpleGrid>

            <FieldError hasError={hasError} errorMessage={formatFieldErrors(errors)} helperText={resolvedHelperText} />
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

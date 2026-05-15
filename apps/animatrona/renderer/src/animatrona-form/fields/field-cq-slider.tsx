'use client'

import { Box, Field, HStack, Slider, Text, VStack } from '@chakra-ui/react'
import type { AnyFieldApi } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'

import { FieldTooltip, type FieldTooltipMeta, useDeclarativeForm, useFormGroup } from '@letar/forms'

export interface CqSliderFieldProps {
  name?: string
  label?: ReactNode
  helperText?: ReactNode
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  /** Tooltip для лейбла */
  tooltip?: FieldTooltipMeta
  /** Минимальное значение CQ (по умолчанию 15 — максимальное качество) */
  min?: number
  /** Максимальное значение CQ (по умолчанию 40 — минимальное качество) */
  max?: number
  /** Шаг изменения (по умолчанию 1) */
  step?: number
  /** Показывать текущее значение */
  showValue?: boolean
  /** Показывать индикаторы качества */
  showQualityIndicator?: boolean
}

/**
 * Определяет качество по значению CQ
 * Меньше CQ = выше качество (инверсия!)
 */
function getQualityInfo(cq: number): { label: string; color: string } {
  if (cq <= 20) {
    return { label: 'Архивное', color: 'purple.400' }
  }
  if (cq <= 24) {
    return { label: 'Высокое', color: 'green.400' }
  }
  if (cq <= 28) {
    return { label: 'Хорошее', color: 'teal.400' }
  }
  if (cq <= 32) {
    return { label: 'Среднее', color: 'yellow.400' }
  }
  return { label: 'Быстрое', color: 'orange.400' }
}

/**
 * AnimatronaForm.Field.CqSlider — Слайдер качества CQ для видеокодеков
 *
 * Важно: CQ имеет инверсную шкалу — меньше значение = выше качество!
 * - CQ 15-20 — Архивное качество (огромные файлы)
 * - CQ 21-24 — Высокое качество
 * - CQ 25-28 — Хорошее качество (рекомендуется)
 * - CQ 29-32 — Среднее качество
 * - CQ 33-40 — Быстрое кодирование (меньше размер)
 *
 * @example
 * ```tsx
 * <AnimatronaForm.Field.CqSlider
 *   name="cq"
 *   label="Качество (CQ)"
 *   showQualityIndicator
 * />
 * ```
 */
export function FieldCqSlider({
  name,
  label = 'Качество (CQ)',
  helperText,
  required,
  disabled,
  readOnly,
  tooltip,
  min = 15,
  max = 40,
  step = 1,
  showValue = true,
  showQualityIndicator = true,
}: CqSliderFieldProps): ReactElement {
  const { form } = useDeclarativeForm()
  const groupContext = useFormGroup()

  // Определяем полный путь к полю
  const fullPath = name ? (groupContext?.name ? `${groupContext.name}.${name}` : name) : (groupContext?.name ?? '')

  return (
    <form.Field name={fullPath}>
      {(field: AnyFieldApi) => {
        const errors = field.state.meta.errors
        const hasError = errors && errors.length > 0
        const value = (field.state.value as number) ?? 28 // По умолчанию "Хорошее качество"

        const qualityInfo = getQualityInfo(value)

        const handleChange = (details: { value: number[] }) => {
          field.handleChange(details.value[0])
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

            <VStack w="100%" gap={2} align="stretch">
              {/* Индикаторы краёв */}
              <HStack justify="space-between" fontSize="xs" color="fg.subtle">
                <Text>Высокое (CQ {min})</Text>
                <Text>Низкое (CQ {max})</Text>
              </HStack>

              {/* Слайдер */}
              <Slider.Root
                min={min}
                max={max}
                step={step}
                value={[value]}
                onValueChange={handleChange}
                disabled={disabled || readOnly}
              >
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumb index={0}>
                    <Slider.HiddenInput />
                  </Slider.Thumb>
                </Slider.Control>
              </Slider.Root>

              {/* Текущее значение и качество */}
              {(showValue || showQualityIndicator) && (
                <HStack justify="space-between">
                  {showValue && (
                    <Text fontSize="sm" fontWeight="medium">
                      CQ: {value}
                    </Text>
                  )}
                  {showQualityIndicator && (
                    <Box px={2} py={0.5} borderRadius="md" bg={qualityInfo.color} color="black" fontSize="xs">
                      {qualityInfo.label}
                    </Box>
                  )}
                </HStack>
              )}
            </VStack>

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

'use client'

import { Box, Field, Flex, HStack, Text } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { useFormGroup } from '../../../form-group'
import { useDeclarativeForm } from '../../form-context'
import type { BaseFieldProps } from '../../types'
import { FieldError, FieldLabel } from '../base'
import { formatFieldErrors, hasFieldErrors } from '../base/field-utils'
import { useResolvedFieldProps } from '../base/use-resolved-field-props'

/** Props для Form.Field.Likert */
export interface LikertFieldProps extends BaseFieldProps {
  /** Текстовые якоря (на каждой точке или только по краям) */
  anchors: string[]
  /** Показывать номера */
  showNumbers?: boolean
  /** Размер шкалы (количество точек) — определяется из anchors.length */
}

/**
 * Form.Field.Likert — шкала Лайкерта (согласия).
 *
 * 5 или 7 точек с текстовыми якорями. Стандарт для опросников.
 *
 * @example
 * ```tsx
 * <Form.Field.Likert
 *   name="experience"
 *   label="Как вы оцениваете опыт?"
 *   anchors={['Совсем не согласен', 'Не согласен', 'Нейтрально', 'Согласен', 'Полностью согласен']}
 *   showNumbers={true}
 * />
 * ```
 *
 * **Значение:** `number` (1-based индекс выбранной точки)
 */
export function FieldLikert({
  name,
  label,
  helperText,
  required,
  disabled,
  readOnly,
  anchors,
  showNumbers = false,
}: LikertFieldProps): ReactElement {
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

  return (
    <form.Field name={fullPath}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(field: any) => {
        const errors = field.state.meta.errors
        const hasError = hasFieldErrors(errors)
        const value = field.state.value as number | undefined

        const handleSelect = (point: number) => {
          if (resolvedDisabled || resolvedReadOnly) return
          field.handleChange(point)
        }

        return (
          <Field.Root invalid={hasError}>
            {resolvedLabel && <FieldLabel label={resolvedLabel} required={resolvedRequired} />}

            {/* Десктопный вид — горизонтальная шкала */}
            <Box display={{ base: 'none', md: 'block' }}>
              <Flex justify="space-between" align="center" py={2}>
                {anchors.map((anchor, i) => {
                  const point = i + 1
                  const isSelected = value === point
                  return (
                    <Flex
                      key={point}
                      direction="column"
                      align="center"
                      gap={1}
                      flex={1}
                      cursor={resolvedDisabled ? 'default' : 'pointer'}
                      onClick={() => handleSelect(point)}
                      opacity={resolvedDisabled ? 0.5 : 1}
                    >
                      {showNumbers && (
                        <Text fontSize="xs" color="fg.muted">
                          {point}
                        </Text>
                      )}
                      <Box
                        w="32px"
                        h="32px"
                        borderRadius="full"
                        borderWidth="2px"
                        borderColor={isSelected ? 'blue.500' : 'border'}
                        bg={isSelected ? 'blue.500' : 'transparent'}
                        transition="all 0.15s"
                        _hover={resolvedDisabled ? undefined : { borderColor: 'blue.400', transform: 'scale(1.1)' }}
                      />
                      <Text
                        fontSize="xs"
                        textAlign="center"
                        color={isSelected ? 'blue.600' : 'fg.muted'}
                        fontWeight={isSelected ? 'medium' : 'normal'}
                        maxW="80px"
                      >
                        {anchor}
                      </Text>
                    </Flex>
                  )
                })}
              </Flex>
              {/* Линия под точками */}
              <Box h="2px" bg="border" mt="-28px" mb="24px" mx="16px" borderRadius="full" />
            </Box>

            {/* Мобильный вид — вертикальная шкала */}
            <Box display={{ base: 'block', md: 'none' }}>
              {anchors.map((anchor, i) => {
                const point = i + 1
                const isSelected = value === point
                return (
                  <HStack
                    key={point}
                    p={2}
                    borderRadius="md"
                    cursor={resolvedDisabled ? 'default' : 'pointer'}
                    onClick={() => handleSelect(point)}
                    bg={isSelected ? 'blue.50' : 'transparent'}
                    _dark={isSelected ? { bg: 'blue.900/20' } : undefined}
                    _hover={resolvedDisabled ? undefined : { bg: 'bg.subtle' }}
                    gap={3}
                  >
                    <Box
                      w="24px"
                      h="24px"
                      borderRadius="full"
                      borderWidth="2px"
                      borderColor={isSelected ? 'blue.500' : 'border'}
                      bg={isSelected ? 'blue.500' : 'transparent'}
                      flexShrink={0}
                    />
                    <Text fontSize="sm" color={isSelected ? 'blue.600' : 'fg'}>
                      {showNumbers && `${point}. `}
                      {anchor}
                    </Text>
                  </HStack>
                )
              })}
            </Box>

            <FieldError hasError={hasError} errorMessage={formatFieldErrors(errors)} helperText={resolvedHelperText} />
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

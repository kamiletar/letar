'use client'

import { Box, Checkbox, Circle, Field, RadioGroup, Table, Text, VStack } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { useDeclarativeForm } from '../../form-context'
import type { BaseFieldProps } from '../../types'
import { FieldError, FieldLabel } from '../base'
import { formatFieldErrors, hasFieldErrors } from '../base/field-utils'
import { useResolvedFieldProps } from '../base/use-resolved-field-props'

/** Строка матрицы (вопрос) */
export interface MatrixRow {
  value: string
  label: string
}

/** Колонка матрицы (вариант ответа) */
export interface MatrixColumn {
  value: string
  label: string
}

/** Props для Form.Field.MatrixChoice */
export interface MatrixChoiceFieldProps extends BaseFieldProps {
  /** Строки матрицы (вопросы) */
  rows: MatrixRow[]
  /** Колонки матрицы (варианты ответа) */
  columns: MatrixColumn[]
  /** Вариант: radio (одиночный), checkbox (множественный), rating (звёзды) */
  variant?: 'radio' | 'checkbox' | 'rating'
}

/**
 * Form.Field.MatrixChoice — матричный выбор для опросников.
 *
 * Таблица "вопрос × вариант ответа" — стандарт в Google Forms и SurveyMonkey.
 *
 * @example
 * ```tsx
 * <Form.Field.MatrixChoice
 *   name="satisfaction"
 *   rows={[
 *     { value: 'speed', label: 'Скорость доставки' },
 *     { value: 'quality', label: 'Качество товара' },
 *   ]}
 *   columns={[
 *     { value: '1', label: 'Плохо' },
 *     { value: '3', label: 'Нормально' },
 *     { value: '5', label: 'Отлично' },
 *   ]}
 *   variant="radio"
 * />
 * ```
 *
 * **Значение:** `Record<string, string | string[]>` — `{ speed: '4', quality: '5' }`
 */
export function FieldMatrixChoice({
  name,
  label,
  helperText,
  required,
  disabled,
  readOnly,
  rows,
  columns,
  variant = 'radio',
}: MatrixChoiceFieldProps): ReactElement {
  const { form } = useDeclarativeForm()
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
        const value: Record<string, string | string[]> = field.state.value ?? {}

        /** Установить значение для строки */
        const setRowValue = (rowValue: string, colValue: string) => {
          if (resolvedDisabled || resolvedReadOnly) return

          if (variant === 'checkbox') {
            // Множественный выбор — toggle в массиве
            const current = (value[rowValue] as string[] | undefined) ?? []
            const next = current.includes(colValue) ? current.filter((v) => v !== colValue) : [...current, colValue]
            field.handleChange({ ...value, [rowValue]: next })
          } else {
            // Radio/Rating — одиночный выбор
            field.handleChange({ ...value, [rowValue]: colValue })
          }
        }

        /** Проверить выбрано ли значение */
        const isSelected = (rowValue: string, colValue: string): boolean => {
          const rowVal = value[rowValue]
          if (variant === 'checkbox') {
            return Array.isArray(rowVal) && rowVal.includes(colValue)
          }
          return rowVal === colValue
        }

        // Мобильный вид — карточки вместо таблицы
        const mobileView = (
          <VStack gap={4} align="stretch" display={{ base: 'flex', md: 'none' }}>
            {rows.map((row) => (
              <Box key={row.value} p={3} borderWidth="1px" borderRadius="md">
                <Text fontWeight="medium" mb={2}>
                  {row.label}
                </Text>
                {variant === 'checkbox' ? (
                  <VStack align="start" gap={1}>
                    {columns.map((col) => (
                      <Checkbox.Root
                        key={col.value}
                        checked={isSelected(row.value, col.value)}
                        onCheckedChange={() => setRowValue(row.value, col.value)}
                        disabled={!!resolvedDisabled}
                        size="sm"
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>{col.label}</Checkbox.Label>
                      </Checkbox.Root>
                    ))}
                  </VStack>
                ) : (
                  <RadioGroup.Root
                    value={String(value[row.value] ?? '')}
                    onValueChange={(details) => {
                      if (details.value) setRowValue(row.value, details.value)
                    }}
                    disabled={!!resolvedDisabled}
                    size="sm"
                  >
                    <VStack align="start" gap={1}>
                      {columns.map((col) => (
                        <RadioGroup.Item key={col.value} value={col.value}>
                          <RadioGroup.ItemHiddenInput />
                          <RadioGroup.ItemIndicator />
                          <RadioGroup.ItemText>{col.label}</RadioGroup.ItemText>
                        </RadioGroup.Item>
                      ))}
                    </VStack>
                  </RadioGroup.Root>
                )}
              </Box>
            ))}
          </VStack>
        )

        // Десктопный вид — таблица с keyboard навигацией
        const handleMatrixKeyDown = (e: React.KeyboardEvent) => {
          const target = e.target as HTMLElement
          const cell = target.closest('[data-matrix-row][data-matrix-col]') as HTMLElement | null
          if (!cell) return

          const currentRow = cell.dataset.matrixRow!
          const currentCol = cell.dataset.matrixCol!
          const rowIdx = rows.findIndex((r) => r.value === currentRow)
          const colIdx = columns.findIndex((c) => c.value === currentCol)

          let nextRowIdx = rowIdx
          let nextColIdx = colIdx

          switch (e.key) {
            case 'ArrowRight':
              nextColIdx = Math.min(colIdx + 1, columns.length - 1)
              break
            case 'ArrowLeft':
              nextColIdx = Math.max(colIdx - 1, 0)
              break
            case 'ArrowDown':
              nextRowIdx = Math.min(rowIdx + 1, rows.length - 1)
              break
            case 'ArrowUp':
              nextRowIdx = Math.max(rowIdx - 1, 0)
              break
            case ' ':
            case 'Enter':
              e.preventDefault()
              setRowValue(rows[rowIdx].value, columns[colIdx].value)
              return
            default:
              return
          }

          e.preventDefault()
          const nextCell = document.querySelector(
            `[data-matrix-row="${rows[nextRowIdx].value}"][data-matrix-col="${columns[nextColIdx].value}"]`
          ) as HTMLElement | null
          nextCell?.focus()
        }

        const desktopView = (
          <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
            <Table.Root size="sm" variant="outline" onKeyDown={handleMatrixKeyDown}>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader w="40%" />
                  {columns.map((col) => (
                    <Table.ColumnHeader key={col.value} textAlign="center">
                      {col.label}
                    </Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {rows.map((row) => {
                  // Подсветка незаполненной строки при required
                  const rowValue = value[row.value]
                  const isRowEmpty =
                    variant === 'checkbox' ? !Array.isArray(rowValue) || rowValue.length === 0 : !rowValue
                  const showRowError = resolvedRequired && hasError && isRowEmpty

                  return (
                    <Table.Row
                      key={row.value}
                      _hover={{ bg: 'bg.subtle' }}
                      bg={showRowError ? 'red.50' : undefined}
                      _dark={showRowError ? { bg: 'red.900/10' } : undefined}
                    >
                      <Table.Cell fontWeight="medium" color={showRowError ? 'red.500' : undefined}>
                        {row.label}
                      </Table.Cell>
                      {columns.map((col) => (
                        <Table.Cell
                          key={col.value}
                          textAlign="center"
                          data-matrix-row={row.value}
                          data-matrix-col={col.value}
                          tabIndex={0}
                          role="gridcell"
                        >
                          {variant === 'checkbox' ? (
                            <Checkbox.Root
                              checked={isSelected(row.value, col.value)}
                              onCheckedChange={() => setRowValue(row.value, col.value)}
                              disabled={!!resolvedDisabled}
                              size="sm"
                            >
                              <Checkbox.HiddenInput />
                              <Checkbox.Control />
                            </Checkbox.Root>
                          ) : variant === 'rating' ? (
                            <Box
                              cursor={resolvedDisabled ? 'default' : 'pointer'}
                              onClick={() => setRowValue(row.value, col.value)}
                              fontSize="lg"
                              color={isSelected(row.value, col.value) ? 'yellow.400' : 'gray.300'}
                              _hover={resolvedDisabled ? undefined : { color: 'yellow.400' }}
                            >
                              ★
                            </Box>
                          ) : (
                            <Circle
                              size="18px"
                              borderWidth="2px"
                              borderColor={isSelected(row.value, col.value) ? 'blue.500' : 'border'}
                              bg={isSelected(row.value, col.value) ? 'blue.500' : 'transparent'}
                              cursor={resolvedDisabled ? 'default' : 'pointer'}
                              onClick={() => setRowValue(row.value, col.value)}
                              transition="all 0.15s"
                              _hover={resolvedDisabled ? undefined : { borderColor: 'blue.400' }}
                              aria-checked={isSelected(row.value, col.value)}
                              role="radio"
                            >
                              {isSelected(row.value, col.value) && <Circle size="8px" bg="white" />}
                            </Circle>
                          )}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        )

        return (
          <Field.Root invalid={hasError}>
            {resolvedLabel && <FieldLabel label={resolvedLabel} required={resolvedRequired} />}
            {desktopView}
            {mobileView}
            <FieldError hasError={hasError} errorMessage={formatFieldErrors(errors)} helperText={resolvedHelperText} />
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

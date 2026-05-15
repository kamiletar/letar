'use client'

import { Box, Button, Field, Flex, HStack, Input, Menu, Portal } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { LuCalendar, LuChevronDown } from 'react-icons/lu'
import type { BaseFieldProps } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'

/**
 * Date range value type
 */
export interface DateRangeValue {
  start: string
  end: string
}

/**
 * Preset types for quick date range selection
 */
export type DateRangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear'

/**
 * Props for Form.Field.DateRange
 */
export interface DateRangeFieldProps extends BaseFieldProps {
  /** Label for start date */
  startLabel?: string
  /** Label for end date */
  endLabel?: string
  /** Placeholder for start date */
  startPlaceholder?: string
  /** Placeholder for end date */
  endPlaceholder?: string
  /** Minimum date (format YYYY-MM-DD) */
  min?: string
  /** Maximum date (format YYYY-MM-DD) */
  max?: string
  /** Enable preset buttons */
  presets?: DateRangePreset[]
  /** Date fields orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Size */
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

/**
 * Get date range for preset
 */
function getPresetRange(preset: DateRangePreset): DateRangeValue {
  const today = new Date()
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  switch (preset) {
    case 'today':
      return { start: formatDate(today), end: formatDate(today) }
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      return { start: formatDate(yesterday), end: formatDate(yesterday) }
    }
    case 'thisWeek': {
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Monday
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday
      return { start: formatDate(startOfWeek), end: formatDate(endOfWeek) }
    }
    case 'lastWeek': {
      const startOfLastWeek = new Date(today)
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 6) // Last Monday
      const endOfLastWeek = new Date(startOfLastWeek)
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6) // Last Sunday
      return { start: formatDate(startOfLastWeek), end: formatDate(endOfLastWeek) }
    }
    case 'thisMonth': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: formatDate(startOfMonth), end: formatDate(endOfMonth) }
    }
    case 'lastMonth': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: formatDate(startOfLastMonth), end: formatDate(endOfLastMonth) }
    }
    case 'thisYear': {
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      const endOfYear = new Date(today.getFullYear(), 11, 31)
      return { start: formatDate(startOfYear), end: formatDate(endOfYear) }
    }
  }
}

/**
 * Get label for preset
 */
function getPresetLabel(preset: DateRangePreset): string {
  switch (preset) {
    case 'today':
      return 'Today'
    case 'yesterday':
      return 'Yesterday'
    case 'thisWeek':
      return 'This week'
    case 'lastWeek':
      return 'Last week'
    case 'thisMonth':
      return 'This month'
    case 'lastMonth':
      return 'Last month'
    case 'thisYear':
      return 'This year'
  }
}

/**
 * Form.Field.DateRange - Date range selection with two fields
 *
 * Renders two date fields for range selection with optional presets.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.DateRange name="period" label="Period" />
 * ```
 *
 * @example With presets
 * ```tsx
 * <Form.Field.DateRange
 *   name="period"
 *   label="Period"
 *   startLabel="From"
 *   endLabel="To"
 *   presets={['today', 'thisWeek', 'thisMonth']}
 * />
 * ```
 *
 * @example Vertical orientation
 * ```tsx
 * <Form.Field.DateRange
 *   name="period"
 *   orientation="vertical"
 * />
 * ```
 */
export const FieldDateRange = createField<DateRangeFieldProps, DateRangeValue>({
  displayName: 'FieldDateRange',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const {
      startLabel = 'Start',
      endLabel = 'End',
      startPlaceholder,
      endPlaceholder,
      min,
      max,
      presets,
      orientation = 'horizontal',
      size = 'md',
    } = componentProps

    const value = (field.state.value as DateRangeValue) ?? { start: '', end: '' }

    const handleStartChange = (newStart: string) => {
      field.handleChange({ ...value, start: newStart })
    }

    const handleEndChange = (newEnd: string) => {
      field.handleChange({ ...value, end: newEnd })
    }

    const handlePreset = (preset: DateRangePreset) => {
      field.handleChange(getPresetRange(preset))
    }

    const Container = orientation === 'horizontal' ? HStack : Box

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />

        <Flex gap={2} direction={orientation === 'horizontal' ? 'row' : 'column'} align="stretch" width="full">
          <Container gap={2} flex={1} alignItems="flex-end">
            {/* Start date */}
            <Box flex={1}>
              <Field.Root disabled={resolved.disabled} readOnly={resolved.readOnly}>
                <Field.Label fontSize="sm" color="fg.muted">
                  {startLabel}
                </Field.Label>
                <Input
                  type="date"
                  value={value.start}
                  onChange={(e) => handleStartChange((e.target as HTMLInputElement).value)}
                  onBlur={field.handleBlur}
                  placeholder={startPlaceholder}
                  min={min}
                  max={value.end || max}
                  size={size}
                  data-field-name={`${fullPath}.start`}
                />
              </Field.Root>
            </Box>

            {/* End date */}
            <Box flex={1}>
              <Field.Root disabled={resolved.disabled} readOnly={resolved.readOnly}>
                <Field.Label fontSize="sm" color="fg.muted">
                  {endLabel}
                </Field.Label>
                <Input
                  type="date"
                  value={value.end}
                  onChange={(e) => handleEndChange((e.target as HTMLInputElement).value)}
                  onBlur={field.handleBlur}
                  placeholder={endPlaceholder}
                  min={value.start || min}
                  max={max}
                  size={size}
                  data-field-name={`${fullPath}.end`}
                />
              </Field.Root>
            </Box>
          </Container>

          {/* Presets menu */}
          {presets && presets.length > 0 && !resolved.readOnly && (
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button variant="outline" size={size} disabled={resolved.disabled}>
                  <LuCalendar />
                  Presets
                  <LuChevronDown />
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    {presets.map((preset) => (
                      <Menu.Item key={preset} value={preset} onClick={() => handlePreset(preset)}>
                        {getPresetLabel(preset)}
                      </Menu.Item>
                    ))}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          )}
        </Flex>

        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})

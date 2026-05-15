'use client'

import { Box, Button, Field, HStack, Input, Stack, Text } from '@chakra-ui/react'
import type { AnyFieldApi } from '@tanstack/react-form'
import { memo, type ReactElement, type ReactNode, useCallback, useMemo } from 'react'
import type { BaseFieldProps, FieldTooltipMeta } from '../../types'
import { FieldError, FieldLabel, getFieldErrors, useResolvedFieldProps } from '../base'

/**
 * Time slot
 */
export interface TimeSlot {
  open: string
  close: string
}

/**
 * Day schedule (null = day off)
 */
export type DaySchedule = TimeSlot | null

/**
 * Weekly schedule
 */
export interface WeeklySchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

/**
 * Day of week
 */
export type DayOfWeek = keyof WeeklySchedule

/**
 * Days configuration
 */
const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_DAY_NAMES: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const DEFAULT_WORKING_HOURS: WeeklySchedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: null,
  sunday: null,
}

/**
 * Constants for custom switch styling
 * Native checkbox used instead of Chakra Switch for RHF compatibility
 */
const SWITCH_STYLES = {
  /** Switch track width */
  trackWidth: '36px',
  /** Switch track height */
  trackHeight: '20px',
  /** Round indicator (thumb) size */
  thumbSize: '16px',
  /** Thumb offset from edge (2px each side for centering in 20px track) */
  thumbOffset: '2px',
  /** Thumb position in enabled state (trackWidth - thumbSize - thumbOffset = 36 - 16 - 2 = 18) */
  thumbEnabledLeft: '18px',
} as const

/**
 * Checks that end time is after start time
 */
function isValidTimeRange(open: string, close: string): boolean {
  const [openH, openM] = open.split(':').map(Number)
  const [closeH, closeM] = close.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM
  return closeMinutes > openMinutes
}

/**
 * Internal component for rendering the schedule.
 * Extracted separately to comply with React hooks rules.
 */
interface ScheduleContentProps {
  field: AnyFieldApi
  schedule: WeeklySchedule
  defaultSchedule: WeeklySchedule
  days: DayOfWeek[]
  mergedDayNames: Record<DayOfWeek, string>
  showCopyToWeekdays: boolean
  offLabel: string
  copyToWeekdaysLabel: string
  defaultOpenTime: string
  defaultCloseTime: string
  disabled?: boolean
  readOnly?: boolean
  resolvedLabel?: ReactNode
  resolvedHelperText?: ReactNode
  resolvedRequired?: boolean
  resolvedTooltip?: FieldTooltipMeta
  fullPath: string
}

const ScheduleContent = memo(function ScheduleContent({
  field,
  schedule,
  days,
  mergedDayNames,
  showCopyToWeekdays,
  offLabel,
  copyToWeekdaysLabel,
  defaultOpenTime,
  defaultCloseTime,
  disabled,
  readOnly,
  resolvedLabel,
  resolvedHelperText,
  resolvedRequired,
  resolvedTooltip,
  fullPath,
}: ScheduleContentProps) {
  const { hasError, errorMessage } = getFieldErrors(field)

  // Check for invalid time ranges
  const invalidDays = useMemo(() => {
    const invalid: DayOfWeek[] = []
    for (const day of days) {
      const daySchedule = schedule[day]
      if (daySchedule && !isValidTimeRange(daySchedule.open, daySchedule.close)) {
        invalid.push(day)
      }
    }
    return invalid
  }, [schedule, days])

  const handleDayToggle = useCallback(
    (day: DayOfWeek, enabled: boolean) => {
      const newSchedule = {
        ...schedule,
        [day]: enabled ? { open: defaultOpenTime, close: defaultCloseTime } : null,
      }
      field.handleChange(newSchedule)
    },
    [schedule, field, defaultOpenTime, defaultCloseTime]
  )

  const handleTimeChange = useCallback(
    (day: DayOfWeek, timeField: 'open' | 'close', value: string) => {
      const current = schedule[day]
      if (!current) {
        return
      }
      const newSchedule = {
        ...schedule,
        [day]: { ...current, [timeField]: value },
      }
      field.handleChange(newSchedule)
    },
    [schedule, field]
  )

  const handleCopyToWeekdays = useCallback(() => {
    const mondaySchedule = schedule.monday
    if (!mondaySchedule) {
      return
    }
    const newSchedule = {
      ...schedule,
      monday: mondaySchedule,
      tuesday: mondaySchedule,
      wednesday: mondaySchedule,
      thursday: mondaySchedule,
      friday: mondaySchedule,
    }
    field.handleChange(newSchedule)
  }, [schedule, field])

  return (
    <Field.Root
      invalid={hasError}
      required={resolvedRequired}
      disabled={disabled}
      readOnly={readOnly}
      data-field-name={fullPath}
    >
      <FieldLabel label={resolvedLabel} tooltip={resolvedTooltip} required={resolvedRequired} />

      <Stack gap={3}>
        {/* Warning about invalid ranges */}
        {invalidDays.length > 0 && (
          <Box p={3} bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md">
            <Text color="red.600" fontSize="sm" fontWeight="medium">
              End time must be after start time: {invalidDays.map((d) => mergedDayNames[d]).join(', ')}
            </Text>
          </Box>
        )}

        {/* Quick actions */}
        {showCopyToWeekdays && days.includes('monday') && (
          <HStack gap={2} flexWrap="wrap">
            <Text fontSize="sm" color="fg.muted">
              Quick actions:
            </Text>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              colorPalette="blue"
              onClick={handleCopyToWeekdays}
              disabled={disabled || readOnly || !schedule.monday}
            >
              {copyToWeekdaysLabel}
            </Button>
          </HStack>
        )}

        {/* Day list */}
        {days.map((day) => {
          const daySchedule = schedule[day]
          const isEnabled = daySchedule !== null && daySchedule !== undefined
          const dayHasError = invalidDays.includes(day)

          return (
            <Box
              key={day}
              data-day={day}
              p={3}
              bg={dayHasError ? 'red.50' : isEnabled ? 'bg.panel' : 'bg.muted'}
              borderRadius="md"
              borderWidth={dayHasError ? '2px' : '1px'}
              borderColor={dayHasError ? 'red.300' : 'border.muted'}
            >
              <HStack justify="space-between" flexWrap="wrap" gap={3}>
                {/* Day and toggle */}
                <HStack gap={3} minW="140px">
                  {/* Native checkbox styled as switch */}
                  <Box
                    as="label"
                    display="inline-flex"
                    alignItems="center"
                    cursor={disabled || readOnly ? 'not-allowed' : 'pointer'}
                    position="relative"
                    opacity={disabled || readOnly ? 0.4 : 1}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => handleDayToggle(day, e.target.checked)}
                      disabled={disabled || readOnly}
                      data-switch={day}
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: 0,
                        height: 0,
                      }}
                    />
                    <Box
                      w={SWITCH_STYLES.trackWidth}
                      h={SWITCH_STYLES.trackHeight}
                      bg={isEnabled ? 'green.500' : 'gray.300'}
                      borderRadius="full"
                      position="relative"
                      transition="background 0.2s"
                    >
                      <Box
                        position="absolute"
                        top={SWITCH_STYLES.thumbOffset}
                        left={isEnabled ? SWITCH_STYLES.thumbEnabledLeft : SWITCH_STYLES.thumbOffset}
                        w={SWITCH_STYLES.thumbSize}
                        h={SWITCH_STYLES.thumbSize}
                        bg="white"
                        borderRadius="full"
                        transition="left 0.2s"
                        boxShadow="sm"
                      />
                    </Box>
                  </Box>
                  <Text fontWeight="medium" color={isEnabled ? 'fg' : 'fg.muted'}>
                    {mergedDayNames[day]}
                  </Text>
                </HStack>

                {/* Time fields */}
                {isEnabled ? (
                  <HStack gap={2}>
                    <Input
                      type="time"
                      size="sm"
                      width="120px"
                      value={daySchedule?.open || defaultOpenTime}
                      onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                      disabled={disabled || readOnly}
                    />
                    <Text color="fg.muted">—</Text>
                    <Input
                      type="time"
                      size="sm"
                      width="120px"
                      value={daySchedule?.close || defaultCloseTime}
                      onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                      disabled={disabled || readOnly}
                    />
                  </HStack>
                ) : (
                  <Text fontSize="sm" color="fg.muted">
                    {offLabel}
                  </Text>
                )}
              </HStack>
            </Box>
          )
        })}
      </Stack>

      <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolvedHelperText} />
    </Field.Root>
  )
})

/**
 * Props for Schedule field
 */
export interface ScheduleFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Tooltip for field label */
  tooltip?: FieldTooltipMeta

  /**
   * Custom day names (for localization)
   */
  dayNames?: Partial<Record<DayOfWeek, string>>

  /**
   * Default schedule when empty
   */
  defaultSchedule?: WeeklySchedule

  /**
   * Days to display (subset of all days)
   * @default all days
   */
  days?: DayOfWeek[]

  /**
   * Show "copy to weekdays" button
   * @default true
   */
  showCopyToWeekdays?: boolean

  /**
   * Text for "day off" state
   * @default 'Day off'
   */
  offLabel?: string

  /**
   * Copy to weekdays button text
   * @default 'Copy Mon to weekdays'
   */
  copyToWeekdaysLabel?: string

  /**
   * Default opening time when enabling a day
   */
  defaultOpenTime?: string

  /**
   * Default closing time when enabling a day
   */
  defaultCloseTime?: string
}

/**
 * Form.Field.Schedule - Weekly schedule editor
 *
 * Renders working hours schedule editor with toggles
 * and time fields for each day of the week.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.Schedule
 *   name="workingHours"
 *   label="Working hours"
 * />
 * ```
 *
 * @example With custom day names
 * ```tsx
 * <Form.Field.Schedule
 *   name="schedule"
 *   dayNames={{
 *     monday: 'Mon',
 *     tuesday: 'Tue',
 *     // ...
 *   }}
 *   offLabel="Day off"
 *   copyToWeekdaysLabel="Copy Mon to weekdays"
 * />
 * ```
 *
 * @example Weekdays only
 * ```tsx
 * <Form.Field.Schedule
 *   name="hours"
 *   days={['monday', 'tuesday', 'wednesday', 'thursday', 'friday']}
 * />
 * ```
 */
export function FieldSchedule({
  name,
  label,
  helperText,
  required,
  disabled,
  readOnly,
  tooltip,
  dayNames = {},
  defaultSchedule = DEFAULT_WORKING_HOURS,
  days = DAYS_OF_WEEK,
  showCopyToWeekdays = true,
  offLabel = 'Day off',
  copyToWeekdaysLabel = 'Copy Mon to weekdays',
  defaultOpenTime = '09:00',
  defaultCloseTime = '18:00',
}: ScheduleFieldProps): ReactElement {
  const {
    form,
    fullPath,
    label: resolvedLabel,
    helperText: resolvedHelperText,
    tooltip: resolvedTooltip,
    required: resolvedRequired,
    disabled: resolvedDisabled,
    readOnly: resolvedReadOnly,
  } = useResolvedFieldProps(name, { label, helperText, required, disabled, readOnly, tooltip })

  // Merge day names
  const mergedDayNames = { ...DEFAULT_DAY_NAMES, ...dayNames }

  return (
    <form.Field name={fullPath}>
      {(field: AnyFieldApi) => {
        const schedule: WeeklySchedule = (field.state.value as WeeklySchedule) || defaultSchedule

        return (
          <ScheduleContent
            field={field}
            schedule={schedule}
            defaultSchedule={defaultSchedule}
            days={days}
            mergedDayNames={mergedDayNames}
            showCopyToWeekdays={showCopyToWeekdays}
            offLabel={offLabel}
            copyToWeekdaysLabel={copyToWeekdaysLabel}
            defaultOpenTime={defaultOpenTime}
            defaultCloseTime={defaultCloseTime}
            disabled={resolvedDisabled}
            readOnly={resolvedReadOnly}
            resolvedLabel={resolvedLabel}
            resolvedHelperText={resolvedHelperText}
            resolvedRequired={resolvedRequired}
            resolvedTooltip={resolvedTooltip}
            fullPath={fullPath}
          />
        )
      }}
    </form.Field>
  )
}

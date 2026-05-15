'use client'

/**
 * Standard field size (xs, sm, md, lg)
 *
 * Used in most components:
 * Select, Combobox, Autocomplete, RadioGroup, SegmentedGroup,
 * Rating, Tags, DateRange
 */
export type FieldSize = 'xs' | 'sm' | 'md' | 'lg'

/**
 * Field size without xs (sm, md, lg)
 *
 * Used in components that don't support xs:
 * RadioCard, CheckboxCard, Listbox, Slider
 */
export type FieldSizeWithoutXs = 'sm' | 'md' | 'lg'

/**
 * Extended field size (2xs to 2xl)
 *
 * Used in components with a full range of sizes:
 * PinInput, ColorPicker
 */
export type FieldSizeExtended = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

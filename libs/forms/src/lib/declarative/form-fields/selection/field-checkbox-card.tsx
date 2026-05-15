'use client'

import { CheckboxCard, CheckboxGroup, Fieldset, Flex, HStack } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { BaseFieldProps, FieldSizeWithoutXs, FieldTooltipMeta, RichOption } from '../../types'
import { createField } from '../base'
import { FieldTooltip } from '../base/field-tooltip'

/**
 * Props for CheckboxCard field
 */
export interface CheckboxCardFieldProps<T = string> extends Omit<BaseFieldProps, 'placeholder'> {
  /** Tooltip for field label */
  tooltip?: FieldTooltipMeta
  /** Options for cards */
  options: RichOption<T>[]
  /** Size (by default: md) */
  size?: FieldSizeWithoutXs
  /** Visual variant (by default: outline) */
  variant?: 'surface' | 'subtle' | 'outline' | 'solid'
  /** Color palette */
  colorPalette?: string
  /** Content alignment (by default: start) */
  align?: 'start' | 'end' | 'center'
  /** Orientation (by default: horizontal) */
  orientation?: 'horizontal' | 'vertical'
  /** Gap between cards (by default: 2) */
  gap?: number | string
}

/**
 * Form.Field.CheckboxCard - Multiple selection as cards
 *
 * Renders a group of checkbox cards for selecting multiple options.
 * Each card can have a label, description and icon.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.CheckboxCard
 *   name="features"
 *   label="Select features"
 *   options={[
 *     { label: 'TypeScript', value: 'ts', description: 'Type safety' },
 *     { label: 'ESLint', value: 'eslint', description: 'Code quality' },
 *     { label: 'Prettier', value: 'prettier', description: 'Formatting' },
 *   ]}
 * />
 * ```
 *
 * @example With icons
 * ```tsx
 * <Form.Field.CheckboxCard
 *   name="permissions"
 *   options={[
 *     { label: 'Admin', value: 'admin', icon: <ShieldIcon /> },
 *     { label: 'User', value: 'user', icon: <UserIcon /> },
 *   ]}
 *   align="center"
 * />
 * ```
 */
export const FieldCheckboxCard = createField<CheckboxCardFieldProps, string[]>({
  displayName: 'FieldCheckboxCard',
  render: ({ field, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    // Value always array for checkbox cards
    const currentValue = field.state.value as string[] | undefined
    const valueArray: string[] = currentValue ?? []

    return (
      <Fieldset.Root invalid={hasError} disabled={resolved.disabled}>
        <CheckboxGroup
          value={valueArray}
          onValueChange={(value) => field.handleChange(value)}
          disabled={resolved.disabled}
          invalid={hasError}
        >
          {resolved.label && (
            <Fieldset.Legend mb={2}>
              {resolved.tooltip ? (
                <HStack gap={1}>
                  <span>{resolved.label}</span>
                  <FieldTooltip {...resolved.tooltip} />
                </HStack>
              ) : (
                resolved.label
              )}
              {resolved.required && (
                <span
                  role="presentation"
                  aria-hidden="true"
                  style={{ color: 'var(--chakra-colors-fg-error)', marginInlineStart: '1px' }}
                >
                  *
                </span>
              )}
            </Fieldset.Legend>
          )}

          <Flex
            gap={componentProps.gap ?? 2}
            direction={(componentProps.orientation ?? 'horizontal') === 'vertical' ? 'column' : 'row'}
            wrap={(componentProps.orientation ?? 'horizontal') === 'horizontal' ? 'wrap' : undefined}
          >
            {componentProps.options.map((opt) => (
              <CheckboxCard.Root
                key={opt.value}
                value={opt.value}
                size={componentProps.size ?? 'md'}
                variant={componentProps.variant ?? 'outline'}
                colorPalette={componentProps.colorPalette}
                align={componentProps.align ?? 'start'}
                disabled={opt.disabled}
              >
                <CheckboxCard.HiddenInput />
                <CheckboxCard.Control>
                  <CheckboxCard.Content>
                    {opt.icon}
                    <CheckboxCard.Label>{opt.label}</CheckboxCard.Label>
                    {opt.description && <CheckboxCard.Description>{opt.description}</CheckboxCard.Description>}
                  </CheckboxCard.Content>
                  <CheckboxCard.Indicator />
                </CheckboxCard.Control>
              </CheckboxCard.Root>
            ))}
          </Flex>
        </CheckboxGroup>

        {hasError ? (
          <Fieldset.ErrorText>{errorMessage}</Fieldset.ErrorText>
        ) : (
          resolved.helperText && <Fieldset.HelperText>{resolved.helperText}</Fieldset.HelperText>
        )}
      </Fieldset.Root>
    )
  },
})

'use client'

import { Box, Field, HStack, IconButton, Input, List, Progress, Text, VStack } from '@chakra-ui/react'
import { type ReactElement, useState } from 'react'
import { LuCheck, LuEye, LuEyeOff, LuX } from 'react-icons/lu'
import type { PasswordRequirement, PasswordStrengthFieldProps } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'

/**
 * Default password requirements
 */
const DEFAULT_REQUIREMENTS: PasswordRequirement[] = ['minLength:8', 'uppercase', 'lowercase', 'number', 'special']

/**
 * Requirement descriptions
 */
const REQUIREMENT_LABELS: Record<PasswordRequirement, string> = {
  'minLength:8': 'Minimum 8 characters',
  uppercase: 'At least one uppercase letter',
  lowercase: 'At least one lowercase letter',
  number: 'At least one digit',
  special: 'At least one special character (!@#$%^&*)',
}

/**
 * Checks if password meets a requirement
 */
function checkRequirement(password: string, requirement: PasswordRequirement): boolean {
  switch (requirement) {
    case 'minLength:8':
      return password.length >= 8
    case 'uppercase':
      return /[A-Z]/.test(password)
    case 'lowercase':
      return /[a-z]/.test(password)
    case 'number':
      return /[0-9]/.test(password)
    case 'special':
      return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    default:
      return false
  }
}

/**
 * Computes password strength (0-100)
 */
function calculateStrength(password: string, requirements: PasswordRequirement[]): number {
  if (!password) {
    return 0
  }

  const metCount = requirements.filter((req) => checkRequirement(password, req)).length
  return Math.round((metCount / requirements.length) * 100)
}

/**
 * Gets description and color for password strength
 */
function getStrengthInfo(strength: number): { label: string; colorPalette: string } {
  if (strength < 25) {
    return { label: 'Weak', colorPalette: 'red' }
  }
  if (strength < 50) {
    return { label: 'Medium', colorPalette: 'orange' }
  }
  if (strength < 75) {
    return { label: 'Good', colorPalette: 'yellow' }
  }
  return { label: 'Strong', colorPalette: 'green' }
}

/**
 * State for password field with strength indicator
 */
interface PasswordStrengthFieldState {
  /** Password visibility */
  visible: boolean
  /** Toggle visibility */
  toggle: () => void
}

/**
 * Form.Field.PasswordStrength - Password with strength indicator
 *
 * Renders a password field with a visual strength indicator and requirements checklist.
 *
 * @example With default requirements
 * ```tsx
 * <Form.Field.PasswordStrength name="password" label="Password" showRequirements />
 * ```
 *
 * @example With custom requirements
 * ```tsx
 * <Form.Field.PasswordStrength
 *   name="password"
 *   requirements={['minLength:8', 'uppercase', 'number']}
 *   showRequirements
 * />
 * ```
 */
export const FieldPasswordStrength = createField<PasswordStrengthFieldProps, string, PasswordStrengthFieldState>({
  displayName: 'FieldPasswordStrength',

  useFieldState: (props) => {
    const [visible, setVisible] = useState(props.defaultVisible ?? false)
    return { visible, toggle: () => setVisible((v) => !v) }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { requirements = DEFAULT_REQUIREMENTS, showRequirements = true } = componentProps
    const { visible, toggle } = fieldState

    const value = (field.state.value as string) ?? ''
    const strength = calculateStrength(value, requirements)
    const { label: strengthLabel, colorPalette } = getStrengthInfo(strength)

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
        <VStack gap={2} align="stretch" width="100%">
          <HStack>
            <Input
              type={visible ? 'text' : 'password'}
              value={value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder={resolved.placeholder ?? 'Enter password'}
              data-field-name={fullPath}
              flex={1}
            />
            <IconButton
              aria-label={visible ? 'Hide password' : 'Show password'}
              onClick={toggle}
              variant="ghost"
              size="sm"
            >
              {visible ? <LuEyeOff /> : <LuEye />}
            </IconButton>
          </HStack>

          {value && (
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" color="fg.muted">
                  Strength
                </Text>
                <Text fontSize="xs" fontWeight="medium" color={`${colorPalette}.600`}>
                  {strengthLabel}
                </Text>
              </HStack>
              <Progress.Root value={strength} colorPalette={colorPalette} size="xs">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </Box>
          )}

          {showRequirements && value && (
            <List.Root fontSize="sm" gap={1}>
              {requirements.map((req) => {
                const met = checkRequirement(value, req)
                return (
                  <List.Item key={req} display="flex" alignItems="center" gap={2}>
                    <Box color={met ? 'green.500' : 'gray.400'}>{met ? <LuCheck size={14} /> : <LuX size={14} />}</Box>
                    <Text color={met ? 'fg.default' : 'fg.muted'}>{REQUIREMENT_LABELS[req]}</Text>
                  </List.Item>
                )
              })}
            </List.Root>
          )}
        </VStack>
        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})

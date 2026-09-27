'use client'

import { type PasswordStrengthStrings, useFieldPlaceholderString, usePasswordStrengthStrings } from '@letar/forms-react'
import { cn } from '@letar/tailwind-utils'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { type ReactElement, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import { SHADCN_NO_PROVIDER_LOCALE } from './selection-strings'
import type { PasswordRequirement, PasswordStrengthFieldProps } from './types'

const DEFAULT_REQUIREMENTS: PasswordRequirement[] = ['minLength:8', 'uppercase', 'lowercase', 'number', 'special']

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

function calculateStrength(password: string, requirements: PasswordRequirement[]): number {
  if (!password) {
    return 0
  }
  const metCount = requirements.filter((req) => checkRequirement(password, req)).length
  return Math.round((metCount / requirements.length) * 100)
}

function getStrengthInfo(
  strength: number,
  strengthLabels: PasswordStrengthStrings['strengthLabels'],
): { label: string; barClass: string; textClass: string } {
  if (strength < 25) {
    return { label: strengthLabels.weak, barClass: 'bg-red-500', textClass: 'text-red-600' }
  }
  if (strength < 50) {
    return { label: strengthLabels.medium, barClass: 'bg-orange-500', textClass: 'text-orange-600' }
  }
  if (strength < 75) {
    return { label: strengthLabels.good, barClass: 'bg-yellow-500', textClass: 'text-yellow-600' }
  }
  return { label: strengthLabels.strong, barClass: 'bg-green-500', textClass: 'text-green-600' }
}

interface PasswordStrengthFieldState {
  visible: boolean
  toggle: () => void
  placeholder: string
  strings: PasswordStrengthStrings
}

/**
 * Form.Field.PasswordStrength — shadcn-скин.
 *
 * Портирован из Chakra-версии без изменений логики (расчёт силы пароля, набор требований).
 * Полоса прогресса — свой `<div>` с шириной в процентах, не `Progress.Root` (нет такого
 * примитива в UIKit-контракте).
 */
export const FieldPasswordStrength = createField<PasswordStrengthFieldProps, string, PasswordStrengthFieldState>({
  displayName: 'FieldPasswordStrength',

  useFieldState: (componentProps): PasswordStrengthFieldState => {
    const [visible, setVisible] = useState(componentProps.defaultVisible ?? false)
    const placeholder = useFieldPlaceholderString('formFieldPlaceholder.passwordStrength', SHADCN_NO_PROVIDER_LOCALE)
    const strings = usePasswordStrengthStrings(SHADCN_NO_PROVIDER_LOCALE)
    return { visible, toggle: () => setVisible((v) => !v), placeholder, strings }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { requirements = DEFAULT_REQUIREMENTS, showRequirements = true } = componentProps
    const { strings } = fieldState
    const value = (field.state.value as string) ?? ''
    const strength = calculateStrength(value, requirements)
    const { label: strengthLabel, barClass, textClass } = getStrengthInfo(strength, strings.strengthLabels)

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <shadcnUIKit.Input
              type={fieldState.visible ? 'text' : 'password'}
              value={value}
              onChange={(v) => field.handleChange(v)}
              onBlur={field.handleBlur}
              placeholder={resolved.placeholder ?? fieldState.placeholder}
              maxLength={componentProps.maxLength}
              autoComplete={componentProps.autoComplete ?? resolved.autocomplete}
              disabled={resolved.disabled}
              readOnly={resolved.readOnly}
              data-field-name={fullPath}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={strings.togglePasswordVisibilityLabel}
              disabled={resolved.disabled}
              onClick={fieldState.toggle}
              className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center disabled:pointer-events-none disabled:opacity-50"
            >
              {fieldState.visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {value && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-muted-foreground text-xs">{strings.strengthCaption}</span>
                <span className={cn('text-xs font-medium', textClass)}>{strengthLabel}</span>
              </div>
              <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
                <div className={cn('h-full transition-all', barClass)} style={{ width: `${strength}%` }} />
              </div>
            </div>
          )}

          {showRequirements && value && (
            <ul className="flex flex-col gap-1 text-sm">
              {requirements.map((req) => {
                const met = checkRequirement(value, req)
                return (
                  <li key={req} className="flex items-center gap-2">
                    {met
                      ? <Check className="size-3.5 text-green-500" />
                      : <X className="size-3.5 text-muted-foreground" />}
                    <span className={met ? 'text-foreground' : 'text-muted-foreground'}>
                      {strings.requirementLabels[req]}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </FieldWrapper>
    )
  },
})

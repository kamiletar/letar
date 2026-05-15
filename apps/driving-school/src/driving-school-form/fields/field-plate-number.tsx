'use client'

import { Field, Input, Text, VStack } from '@chakra-ui/react'
import type { AnyFieldApi } from '@tanstack/react-form'
import type { ReactElement } from 'react'

// Импорт из index (публичный API)
import { useDeclarativeForm, useFormGroup } from '@letar/forms'

// Допустимые буквы в госномерах РФ
const VALID_LETTERS = 'АВЕКМНОРСТУХ'
const LATIN_TO_CYRILLIC: Record<string, string> = {
  A: 'А',
  a: 'А',
  B: 'В',
  b: 'В',
  E: 'Е',
  e: 'Е',
  K: 'К',
  k: 'К',
  M: 'М',
  m: 'М',
  H: 'Н',
  h: 'Н',
  O: 'О',
  o: 'О',
  P: 'Р',
  p: 'Р',
  C: 'С',
  c: 'С',
  T: 'Т',
  t: 'Т',
  Y: 'У',
  y: 'У',
  X: 'Х',
  x: 'Х',
}

// Позиции где допустим пробел
const SPACE_POSITIONS = [1, 4, 6]

function isValidForPosition(char: string, position: number): boolean {
  const isLetter = VALID_LETTERS.includes(char)
  const isDigit = /\d/.test(char)

  if (position === 0) {
    return isLetter
  }
  if (position >= 1 && position <= 3) {
    return isDigit
  }
  if (position >= 4 && position <= 5) {
    return isLetter
  }
  if (position >= 6 && position <= 8) {
    return isDigit
  }
  return false
}

function normalizeChar(char: string): string | null {
  if (LATIN_TO_CYRILLIC[char]) {
    return LATIN_TO_CYRILLIC[char]
  }
  const upper = char.toUpperCase()
  if (VALID_LETTERS.includes(upper) || /\d/.test(char)) {
    return upper
  }
  return null
}

function processInput(input: string): string {
  let result = ''
  let position = 0

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (char === ' ') {
      if (SPACE_POSITIONS.includes(position) && !result.endsWith(' ')) {
        result += ' '
      }
      continue
    }

    const normalized = normalizeChar(char)
    if (!normalized) {
      continue
    }

    if (!isValidForPosition(normalized, position)) {
      continue
    }

    if (SPACE_POSITIONS.includes(position) && result.length > 0 && !result.endsWith(' ')) {
      result += ' '
    }

    result += normalized
    position++
  }

  return result
}

export interface PlateNumberFieldProps {
  name?: string
  label?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  /** Показывать подсказку под полем */
  showHint?: boolean
}

/**
 * Form.Field.PlateNumber - Поле ввода госномера с маской
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Field.PlateNumber name="plateNumber" label="Госномер" />
 * ```
 */
export function FieldPlateNumber({
  name,
  label,
  helperText,
  required,
  disabled,
  readOnly,
  showHint = true,
}: PlateNumberFieldProps): ReactElement {
  const { form } = useDeclarativeForm()
  const groupContext = useFormGroup()

  // Определяем полный путь к полю
  const fullPath = name ? (groupContext?.name ? `${groupContext.name}.${name}` : name) : (groupContext?.name ?? '')

  return (
    <form.Field name={fullPath}>
      {(field: AnyFieldApi) => {
        const errors = field.state.meta.errors
        const hasError = errors && errors.length > 0

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const formatted = processInput(e.target.value)
          field.handleChange(formatted)
        }

        return (
          <Field.Root invalid={hasError} required={required} disabled={disabled} readOnly={readOnly}>
            {label && (
              <Field.Label>
                {label}
                <Field.RequiredIndicator />
              </Field.Label>
            )}
            <VStack align="stretch" gap={1}>
              <Input
                value={(field.state.value as string) ?? ''}
                onChange={handleChange}
                onBlur={field.handleBlur}
                placeholder="А 777 АА 77"
                fontFamily="mono"
                letterSpacing="wider"
                data-field-name={fullPath}
              />
              {showHint && (
                <Text fontSize="xs" color="fg.muted">
                  Английские буквы заменятся автоматически
                </Text>
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

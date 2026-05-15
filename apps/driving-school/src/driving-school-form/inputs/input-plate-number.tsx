'use client'

import { Field, Input, type InputProps, Text, VStack } from '@chakra-ui/react'
import { forwardRef, useCallback, useState } from 'react'

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

// Позиции где допустим пробел (после групп: буква, 3 цифры, 2 буквы)
const SPACE_POSITIONS = [1, 4, 6]

/**
 * Проверяет тип символа для позиции.
 * Формат: БУКВА(0) + ЦИФРЫ(1-3) + БУКВЫ(4-5) + ЦИФРЫ(6-8)
 */
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

/**
 * Нормализует символ (латиница -> кириллица, uppercase)
 */
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

/**
 * Обрабатывает ввод госномера:
 * - Пробелы пользователя сохраняются если в правильной позиции
 * - Пробелы добавляются автоматически если пользователь их не ввёл
 * - Валидация структуры по позициям
 */
function processInput(input: string): string {
  let result = ''
  let position = 0 // позиция значащего символа

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    // Пробел от пользователя
    if (char === ' ') {
      // Разрешаем пробел только в определённых позициях и только один
      if (SPACE_POSITIONS.includes(position) && !result.endsWith(' ')) {
        result += ' '
      }
      continue
    }

    const normalized = normalizeChar(char)
    if (!normalized) {
      continue
    }

    // Проверяем подходит ли символ для текущей позиции
    if (!isValidForPosition(normalized, position)) {
      continue
    }

    // Автоматически добавляем пробел перед символом если нужно
    if (SPACE_POSITIONS.includes(position) && result.length > 0 && !result.endsWith(' ')) {
      result += ' '
    }

    result += normalized
    position++
  }

  return result
}

/**
 * Валидирует формат российского госномера
 * Формат: А 123 БВ 77 или А 123 БВ 777
 */
export function validatePlateNumber(value: string): boolean {
  if (!value) {
    return true // Пустое значение допустимо (поле опциональное)
  }
  // Убираем пробелы для валидации
  const normalized = value.replace(/\s/g, '')
  // Буква + 3 цифры + 2 буквы + 2-3 цифры региона
  const regex = /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/
  return regex.test(normalized)
}

/**
 * Форматирует госномер для отображения с пробелами
 * А123БВ777 → А 123 БВ 777
 */
export function formatPlateNumberDisplay(value: string): string {
  if (!value) {
    return ''
  }
  // Убираем существующие пробелы
  const clean = value.replace(/\s/g, '')
  // Разбиваем: буква + 3 цифры + 2 буквы + регион
  const match = clean.match(/^([АВЕКМНОРСТУХ])(\d{3})([АВЕКМНОРСТУХ]{2})(\d{2,3})$/)
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`
  }
  return value
}

/**
 * Убирает пробелы из госномера (для сохранения в БД)
 */
export function stripPlateNumberSpaces(value: string): string {
  return value.replace(/\s/g, '')
}

export interface InputPlateNumberProps extends Omit<InputProps, 'value' | 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  /** Показывать ошибку валидации */
  showError?: boolean
  /** Кастомное сообщение об ошибке */
  errorMessage?: string
  /** Показывать подсказку под полем */
  showHint?: boolean
}

/**
 * Инпут для российского госномера с маской и валидацией
 *
 * Особенности:
 * - Автоформатирование: А 777 АА 77
 * - Пробелы добавляются автоматически
 * - Латиница заменяется на кириллицу
 * - Валидация структуры: буква + 3 цифры + 2 буквы + 2-3 цифры
 *
 * @example
 * ```tsx
 * <InputPlateNumber
 *   value={plateNumber}
 *   onChange={setPlateNumber}
 *   showError
 * />
 * ```
 */
export const InputPlateNumber = forwardRef<HTMLInputElement, InputPlateNumberProps>(
  ({ value = '', onChange, showError = false, errorMessage, showHint = true, ...props }, ref) => {
    const [touched, setTouched] = useState(false)

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = processInput(e.target.value)
        onChange?.(formatted)
      },
      [onChange]
    )

    const handleBlur = useCallback(() => {
      setTouched(true)
    }, [])

    const isValid = validatePlateNumber(value)
    const showValidationError = showError && touched && value && !isValid

    return (
      <VStack align="stretch" gap={1}>
        <Input
          ref={ref}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="А 777 АА 77"
          fontFamily="mono"
          letterSpacing="wider"
          {...props}
        />
        {showHint && (
          <Text fontSize="xs" color="fg.muted">
            Английские буквы заменятся автоматически
          </Text>
        )}
        {showValidationError && <Field.ErrorText>{errorMessage ?? 'Неверный формат госномера'}</Field.ErrorText>}
      </VStack>
    )
  }
)

InputPlateNumber.displayName = 'InputPlateNumber'

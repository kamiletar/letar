'use client'

import { Input } from '@chakra-ui/react'
import { formatPhone, getDigitsOnly } from '@letar/format-utils'
import { type ChangeEvent } from 'react'

export interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  id?: string
}

/**
 * Контролируемый компонент ввода телефона с автоматическим форматированием.
 * Формат отображения: +7 (XXX) XXX-XX-XX
 * Формат значения: +7XXXXXXXXXX (только цифры)
 */
export function PhoneInput({ value, onChange, disabled, placeholder, id }: PhoneInputProps) {
  // Форматируем значение для отображения
  const displayValue = formatPhone(value || '')

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    const digitsOnly = getDigitsOnly(formatted)

    // Возвращаем только цифры с +7
    onChange(digitsOnly)
  }

  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      id={id}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder ?? '+7 (999) 123-45-67'}
      maxLength={18} // +7 (XXX) XXX-XX-XX = 18 символов
      disabled={disabled}
    />
  )
}

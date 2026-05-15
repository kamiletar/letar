'use client'

import { Box, Field, Flex, Group, Input, Text, Tooltip } from '@chakra-ui/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useDeclarativeFormOptional } from '../../../form-context'
import { CardBrandIcon } from './card-brand-icon'
import type { CardBrand } from './utils/detect-brand'
import { detectBrand } from './utils/detect-brand'
import { formatExpiry, isExpiryValid } from './utils/format-expiry'
import { formatCardNumber, maxFormattedLength, stripCardNumber } from './utils/format-number'
import { luhn } from './utils/luhn'

/** Раскладка компонента */
export type CreditCardLayout = 'inline' | 'stacked'

/** Пропсы компонента Form.Field.CreditCard */
export interface CreditCardFieldProps {
  /** Имя поля (группы) в форме */
  name?: string
  /** Метка поля */
  label?: string
  /** Ограничить допустимые бренды */
  brands?: CardBrand[]
  /** Показывать иконку бренда (по умолчанию: true) */
  showBrandIcon?: boolean
  /** Раскладка: inline (в ряд) или stacked (стопкой) */
  layout?: CreditCardLayout
  /** Отключить поле */
  disabled?: boolean
  /** Только чтение */
  readOnly?: boolean
  /** Placeholder для номера */
  numberPlaceholder?: string
  /** Placeholder для срока */
  expiryPlaceholder?: string
  /** Placeholder для CVC */
  cvcPlaceholder?: string
}

/** Статус валидации поля */
type FieldStatus = 'idle' | 'valid' | 'error'

/**
 * Compound компонент для ввода данных банковской карты.
 *
 * UX паттерны (Baymard Institute + Stripe):
 * - Иконка бренда внутри поля номера слева с transition 200ms
 * - Авто-форматирование с пробелами при вводе (4-4-4-4 / 4-6-5)
 * - Smart expiry: ввод «4» → «04/», авто-слэш
 * - Валидация Luhn на blur, не ждать submit
 * - CVC tooltip с подсказкой где найти код
 * - inputMode="numeric" для мобильного keypad
 * - 16px font minimum (предотвращает iOS zoom)
 * - Responsive: inline на desktop, stacked на mobile
 *
 * ⚠️ PCI DSS: Для реальных платежей используйте Stripe Elements.
 *
 * @example
 * ```tsx
 * <Form.Field.CreditCard name="card" label="Данные карты" />
 * ```
 */
export function CreditCardField({
  name = 'card',
  label = 'Данные карты',
  brands,
  showBrandIcon = true,
  layout = 'inline',
  disabled,
  readOnly,
  numberPlaceholder = '0000 0000 0000 0000',
  expiryPlaceholder = 'MM / YY',
  cvcPlaceholder = 'CVC',
}: CreditCardFieldProps) {
  const formCtx = useDeclarativeFormOptional()

  // Refs для автоматического перехода между полями
  const expiryRef = useRef<HTMLInputElement>(null)
  const cvcRef = useRef<HTMLInputElement>(null)

  // Локальное состояние полей
  const [numberDisplay, setNumberDisplay] = useState('')
  const [expiryDisplay, setExpiryDisplay] = useState('')
  const [cvcValue, setCvcValue] = useState('')

  // Статусы валидации (для отображения ✓ / ошибки)
  const [numberStatus, setNumberStatus] = useState<FieldStatus>('idle')
  const [expiryStatus, setExpiryStatus] = useState<FieldStatus>('idle')
  const [cvcStatus, setCvcStatus] = useState<FieldStatus>('idle')
  const [numberError, setNumberError] = useState<string>()
  const [expiryError, setExpiryError] = useState<string>()

  // Определяем бренд по номеру
  const brandInfo = useMemo(() => detectBrand(numberDisplay), [numberDisplay])

  // Проверяем допустимость бренда
  const isBrandAllowed = useMemo(() => {
    if (!brands || brands.length === 0) return true
    return brands.includes(brandInfo.brand)
  }, [brands, brandInfo.brand])

  // --- Обработчик номера карты ---
  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = stripCardNumber(e.target.value)
      const formatted = formatCardNumber(raw)
      setNumberDisplay(formatted)
      setNumberStatus('idle')
      setNumberError(undefined)

      if (formCtx?.form) {
        formCtx.form.setFieldValue(`${name}.number`, raw)
      }

      // Автопереход к expiry когда номер полный
      const maxLen = Math.max(...brandInfo.lengths)
      if (raw.length >= maxLen) {
        expiryRef.current?.focus()
      }
    },
    [formCtx, name, brandInfo.lengths]
  )

  // Валидация номера на blur (Baymard: 53% сайтов ошибаются тут)
  const handleNumberBlur = useCallback(() => {
    const raw = stripCardNumber(numberDisplay)
    if (!raw) return

    if (raw.length < 12) {
      setNumberStatus('error')
      setNumberError('Номер слишком короткий')
    } else if (!luhn(raw)) {
      setNumberStatus('error')
      setNumberError('Некорректный номер карты')
    } else if (!isBrandAllowed) {
      setNumberStatus('error')
      setNumberError('Этот тип карты не поддерживается')
    } else {
      setNumberStatus('valid')
      setNumberError(undefined)
    }
  }, [numberDisplay, isBrandAllowed])

  // --- Smart Expiry ---
  const handleExpiryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(/\D/g, '')

      // Smart month: ввод 2-9 → автоматически 02-09
      if (raw.length === 1 && Number(raw) > 1) {
        raw = `0${raw}`
      }

      const formatted = formatExpiry(raw)
      setExpiryDisplay(formatted)
      setExpiryStatus('idle')
      setExpiryError(undefined)

      if (formCtx?.form) {
        formCtx.form.setFieldValue(`${name}.expiry`, formatted)
      }

      // Автопереход к CVC когда expiry полный (MM/YY = 5 символов)
      if (formatted.length === 5) {
        cvcRef.current?.focus()
      }
    },
    [formCtx, name]
  )

  // Валидация expiry на blur
  const handleExpiryBlur = useCallback(() => {
    if (!expiryDisplay) return

    if (expiryDisplay.length < 5) {
      setExpiryStatus('error')
      setExpiryError('Введите MM/YY')
    } else if (!isExpiryValid(expiryDisplay)) {
      setExpiryStatus('error')
      setExpiryError('Карта просрочена')
    } else {
      setExpiryStatus('valid')
      setExpiryError(undefined)
    }
  }, [expiryDisplay])

  // --- CVC ---
  const handleCvcChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, brandInfo.cvcLength)
      setCvcValue(raw)
      setCvcStatus('idle')

      if (formCtx?.form) {
        formCtx.form.setFieldValue(`${name}.cvc`, raw)
      }
    },
    [formCtx, name, brandInfo.cvcLength]
  )

  // Валидация CVC на blur
  const handleCvcBlur = useCallback(() => {
    if (!cvcValue) return

    if (cvcValue.length < brandInfo.cvcLength) {
      setCvcStatus('error')
    } else {
      setCvcStatus('valid')
    }
  }, [cvcValue, brandInfo.cvcLength])

  const isInline = layout === 'inline'

  // Стили для статуса валидации (зелёная ✓ или красная рамка)
  const statusBorder = (status: FieldStatus) => {
    if (status === 'valid') return '1px solid var(--chakra-colors-green-500, #38a169)'
    if (status === 'error') return '1px solid var(--chakra-colors-red-500, #e53e3e)'
    return undefined
  }

  const statusIcon = (status: FieldStatus) => {
    if (status === 'valid') return '✓'
    return null
  }

  return (
    <Field.Root invalid={numberStatus === 'error' || expiryStatus === 'error'}>
      {label && <Field.Label>{label}</Field.Label>}

      <Flex
        role="group"
        aria-label={label}
        direction={isInline ? 'row' : 'column'}
        gap={isInline ? 0 : 3}
        align={isInline ? 'center' : 'stretch'}
        borderWidth={isInline ? '1px' : 0}
        borderColor={isInline ? 'border' : undefined}
        borderRadius={isInline ? 'md' : undefined}
        overflow={isInline ? 'hidden' : undefined}
        _focusWithin={
          isInline
            ? { borderColor: 'colorPalette.500', boxShadow: '0 0 0 1px var(--chakra-colors-colorPalette-500)' }
            : undefined
        }
      >
        {/* Иконка бренда + Номер карты */}
        <Group attached={!isInline} flex={isInline ? '1' : undefined} gap={0}>
          {showBrandIcon && (
            <Box px={2} display="flex" alignItems="center" borderRightWidth={isInline ? '1px' : 0} borderColor="border">
              <CardBrandIcon brand={brandInfo.brand} size={28} />
            </Box>
          )}
          <Box position="relative" flex={1}>
            <Input
              value={numberDisplay}
              onChange={handleNumberChange}
              onBlur={handleNumberBlur}
              placeholder={numberPlaceholder}
              inputMode="numeric"
              autoComplete="cc-number"
              name="cardnumber"
              maxLength={maxFormattedLength(numberDisplay)}
              disabled={disabled}
              readOnly={readOnly}
              aria-label="Номер карты"
              fontSize="16px"
              border={isInline ? 'none' : undefined}
              borderColor={!isInline ? (statusBorder(numberStatus) ? undefined : 'border') : undefined}
              style={!isInline ? { border: statusBorder(numberStatus) } : undefined}
              _focus={isInline ? { boxShadow: 'none' } : undefined}
            />
            {statusIcon(numberStatus) && (
              <Box
                position="absolute"
                right={2}
                top="50%"
                transform="translateY(-50%)"
                color="green.500"
                fontSize="sm"
                fontWeight="bold"
              >
                {statusIcon(numberStatus)}
              </Box>
            )}
          </Box>
        </Group>

        {/* Строка: Срок + CVC (рядом в обоих layout) */}
        <Flex gap={isInline ? 0 : 2}>
          {/* Срок действия */}
          <Box position="relative">
            <Input
              ref={expiryRef}
              value={expiryDisplay}
              onChange={handleExpiryChange}
              onBlur={handleExpiryBlur}
              placeholder={expiryPlaceholder}
              inputMode="numeric"
              autoComplete="cc-exp"
              name="cc-exp"
              maxLength={5}
              disabled={disabled}
              readOnly={readOnly}
              aria-label="Срок действия"
              width={isInline ? '100px' : undefined}
              fontSize="16px"
              border={isInline ? 'none' : undefined}
              borderLeft={isInline ? '1px solid' : undefined}
              borderColor={isInline ? 'border' : undefined}
              borderRadius={isInline ? 0 : undefined}
              style={!isInline ? { border: statusBorder(expiryStatus) } : undefined}
              _focus={isInline ? { boxShadow: 'none' } : undefined}
            />
            {statusIcon(expiryStatus) && (
              <Box
                position="absolute"
                right={2}
                top="50%"
                transform="translateY(-50%)"
                color="green.500"
                fontSize="sm"
                fontWeight="bold"
              >
                {statusIcon(expiryStatus)}
              </Box>
            )}
          </Box>

          {/* CVC с tooltip */}
          <Box position="relative">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Input
                  ref={cvcRef}
                  value={cvcValue}
                  onChange={handleCvcChange}
                  onBlur={handleCvcBlur}
                  placeholder={cvcPlaceholder}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  name="cvc"
                  maxLength={brandInfo.cvcLength}
                  disabled={disabled}
                  readOnly={readOnly}
                  aria-label={`CVC (${brandInfo.cvcLength} цифры)`}
                  width={isInline ? '80px' : undefined}
                  fontSize="16px"
                  border={isInline ? 'none' : undefined}
                  borderLeft={isInline ? '1px solid' : undefined}
                  borderColor={isInline ? 'border' : undefined}
                  borderRadius={isInline ? 0 : undefined}
                  style={!isInline ? { border: statusBorder(cvcStatus) } : undefined}
                  _focus={isInline ? { boxShadow: 'none' } : undefined}
                />
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>
                  <Text fontSize="xs">
                    {brandInfo.brand === 'amex'
                      ? '4 цифры на лицевой стороне карты'
                      : '3 цифры на обратной стороне карты'}
                  </Text>
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
            {statusIcon(cvcStatus) && (
              <Box
                position="absolute"
                right={2}
                top="50%"
                transform="translateY(-50%)"
                color="green.500"
                fontSize="sm"
                fontWeight="bold"
              >
                {statusIcon(cvcStatus)}
              </Box>
            )}
          </Box>
        </Flex>
      </Flex>

      {/* Ошибки (inline под полями — никогда не очищаем данные!) */}
      {numberError && <Field.ErrorText>{numberError}</Field.ErrorText>}
      {expiryError && <Field.ErrorText>{expiryError}</Field.ErrorText>}
    </Field.Root>
  )
}

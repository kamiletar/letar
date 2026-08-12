'use client'

import type { CardBrand } from '@letar/forms-core/credit-card'
import {
  detectBrand,
  formatCardNumber,
  formatExpiry,
  isExpiryValid,
  luhn,
  maxFormattedLength,
  stripCardNumber,
} from '@letar/forms-core/credit-card'
import { useDeclarativeFormOptional } from '@letar/forms-react'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import type { ChangeEvent, ReactElement } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { CardBrandIcon } from './card-brand-icon'

/** Раскладка компонента */
export type CreditCardLayout = 'inline' | 'stacked'

/** Пропсы компонента Form.Field.CreditCard (shadcn-скин) */
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

const statusClass = (status: FieldStatus, isInline: boolean): string => {
  if (isInline) {
    return ''
  }
  if (status === 'valid') {
    return 'border-green-500'
  }
  if (status === 'error') {
    return 'border-destructive'
  }
  return ''
}

/**
 * Compound компонент для ввода данных банковской карты (shadcn-скин, Фаза 8, Этап 6).
 *
 * Портирован из `@letar/forms` (Chakra) — та же логика на голых `<input>`/Tailwind вместо
 * Chakra `Input`/`Flex`/`Group`/`Tooltip`. Форматтеры (`detectBrand`, `formatCardNumber`,
 * `formatExpiry`, `luhn`, `isExpiryValid`) переиспользуются 1:1 из `@letar/forms-core/credit-card` —
 * никакого `useMaskField`/`MaskController` здесь нет вовсе (не заблокировано архитектурной
 * несовместимостью, которую решает `document-field-base.tsx`), только раскладка JSX другая.
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
}: CreditCardFieldProps): ReactElement {
  const formCtx = useDeclarativeFormOptional()

  const expiryRef = useRef<HTMLInputElement>(null)
  const cvcRef = useRef<HTMLInputElement>(null)

  const [numberDisplay, setNumberDisplay] = useState('')
  const [expiryDisplay, setExpiryDisplay] = useState('')
  const [cvcValue, setCvcValue] = useState('')

  const [numberStatus, setNumberStatus] = useState<FieldStatus>('idle')
  const [expiryStatus, setExpiryStatus] = useState<FieldStatus>('idle')
  const [cvcStatus, setCvcStatus] = useState<FieldStatus>('idle')
  const [numberError, setNumberError] = useState<string>()
  const [expiryError, setExpiryError] = useState<string>()

  const brandInfo = useMemo(() => detectBrand(numberDisplay), [numberDisplay])

  const isBrandAllowed = useMemo(() => {
    if (!brands || brands.length === 0) {
      return true
    }
    return brands.includes(brandInfo.brand)
  }, [brands, brandInfo.brand])

  const handleNumberChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = stripCardNumber(e.target.value)
      const formatted = formatCardNumber(raw)
      setNumberDisplay(formatted)
      setNumberStatus('idle')
      setNumberError(undefined)

      if (formCtx?.form) {
        formCtx.form.setFieldValue(`${name}.number`, raw)
      }

      const maxLen = Math.max(...brandInfo.lengths)
      if (raw.length >= maxLen) {
        expiryRef.current?.focus()
      }
    },
    [formCtx, name, brandInfo.lengths],
  )

  const handleNumberBlur = useCallback(() => {
    const raw = stripCardNumber(numberDisplay)
    if (!raw) {
      return
    }

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

  const handleExpiryChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(/\D/g, '')

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

      if (formatted.length === 5) {
        cvcRef.current?.focus()
      }
    },
    [formCtx, name],
  )

  const handleExpiryBlur = useCallback(() => {
    if (!expiryDisplay) {
      return
    }

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

  const handleCvcChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, brandInfo.cvcLength)
      setCvcValue(raw)
      setCvcStatus('idle')

      if (formCtx?.form) {
        formCtx.form.setFieldValue(`${name}.cvc`, raw)
      }
    },
    [formCtx, name, brandInfo.cvcLength],
  )

  const handleCvcBlur = useCallback(() => {
    if (!cvcValue) {
      return
    }

    setCvcStatus(cvcValue.length < brandInfo.cvcLength ? 'error' : 'valid')
  }, [cvcValue, brandInfo.cvcLength])

  const isInline = layout === 'inline'
  const cvcHint = brandInfo.brand === 'amex' ? '4 цифры на лицевой стороне карты' : '3 цифры на обратной стороне карты'

  return (
    <div
      data-slot="field-root"
      data-invalid={(numberStatus === 'error' || expiryStatus === 'error') || undefined}
      className="space-y-2"
    >
      {label && <span className="text-sm leading-none font-medium">{label}</span>}

      <div
        role="group"
        aria-label={label}
        className={cn(
          'flex',
          isInline ? 'flex-row items-center overflow-hidden rounded-md border' : 'flex-col items-stretch gap-3',
          isInline && 'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        )}
      >
        {/* Иконка бренда + Номер карты */}
        <div className={cn('flex gap-0', isInline ? 'flex-1' : 'flex-col')}>
          {showBrandIcon && (
            <div className={cn('flex items-center px-2', isInline && 'border-r')}>
              <CardBrandIcon brand={brandInfo.brand} size={28} />
            </div>
          )}
          <div className="relative flex-1">
            <input
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
              data-slot="input"
              className={cn(
                'text-base',
                isInline
                  ? 'w-full border-0 bg-transparent px-3 py-1 outline-none focus-visible:ring-0'
                  : cn(NATIVE_INPUT_CLASS, statusClass(numberStatus, isInline)),
              )}
            />
            {numberStatus === 'valid' && (
              <span className="absolute top-1/2 right-2 -translate-y-1/2 text-sm font-bold text-green-500">✓</span>
            )}
          </div>
        </div>

        {/* Срок + CVC */}
        <div className={cn('flex', isInline ? 'gap-0' : 'gap-2')}>
          <div className="relative">
            <input
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
              data-slot="input"
              className={cn(
                'text-base',
                isInline
                  ? 'w-[100px] border-0 border-l bg-transparent px-3 py-1 outline-none focus-visible:ring-0'
                  : cn(NATIVE_INPUT_CLASS, statusClass(expiryStatus, isInline)),
              )}
            />
            {expiryStatus === 'valid' && (
              <span className="absolute top-1/2 right-2 -translate-y-1/2 text-sm font-bold text-green-500">✓</span>
            )}
          </div>

          <div className="relative">
            <input
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
              title={cvcHint}
              data-slot="input"
              className={cn(
                'text-base',
                isInline
                  ? 'w-[80px] border-0 border-l bg-transparent px-3 py-1 outline-none focus-visible:ring-0'
                  : cn(NATIVE_INPUT_CLASS, statusClass(cvcStatus, isInline)),
              )}
            />
            {cvcStatus === 'valid' && (
              <span className="absolute top-1/2 right-2 -translate-y-1/2 text-sm font-bold text-green-500">✓</span>
            )}
          </div>
        </div>
      </div>

      {/* Ошибки (inline под полями — никогда не очищаем данные!) */}
      {numberError && (
        <p role="alert" className="text-destructive text-sm">
          {numberError}
        </p>
      )}
      {expiryError && (
        <p role="alert" className="text-destructive text-sm">
          {expiryError}
        </p>
      )}
    </div>
  )
}

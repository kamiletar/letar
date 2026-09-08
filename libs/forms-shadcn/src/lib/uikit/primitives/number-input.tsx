'use client'

import type { UIKitNumberInputProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import { useEffect, useRef, useState } from 'react'

/**
 * Определяет десятичный разделитель заданной локали через нативный `Intl.NumberFormat` —
 * без сторонней зависимости (`@internationalized/number`, которую использует Chakra-скин, здесь
 * избыточна для этой единственной задачи, см. комментарий у компонента ниже).
 */
function getDecimalSeparator(locale: string | undefined): string {
  if (!locale) {
    return '.'
  }
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(1.1)
    return parts.find((p) => p.type === 'decimal')?.value ?? '.'
  } catch {
    return '.'
  }
}

function formatValue(value: number | null): string {
  return value === null || Number.isNaN(value) ? '' : String(value)
}

/**
 * shadcn-скин `NumberInput` — `type="text"` + `role="spinbutton"`/`aria-value*` вручную (тот же
 * ARIA-контракт, что у `@zag-js/number-input`, на котором построен Chakra-скин), не нативный
 * `<input type="number">`.
 *
 * Причина смены типа — не косметика: у нативного `type="number"` `.value` браузер сбрасывает в
 * `""` для любого синтаксически невалидного по HTML5-спеке float (в том числе с запятой вместо
 * точки) ДО того, как значение долетает до `onChange` — JS не может увидеть исходно введённый
 * текст, чтобы его нормализовать. Единственный способ поддержать десятичную запятую — перестать
 * полагаться на нативную валидацию числа и разбирать текст самим.
 *
 * Beta-упрощение (см. `field-currency.tsx`) сохраняется: разбор через `Intl.NumberFormat` только
 * для определения разделителя, не полноценное посимвольное Intl-форматирование при вводе, как в
 * Chakra-версии (`@internationalized/number`) — этой библиотеке она не нужна.
 */
export function NumberInput(
  { value, onChange, onBlur, min, max, step, disabled, readOnly, locale, ...rest }: UIKitNumberInputProps,
) {
  const [text, setText] = useState(() => formatValue(value))
  const lastCommittedValue = useRef(value)

  // Синхронизируем черновик с внешним значением, только если оно изменилось НЕ из-за нашего же
  // onChange (иначе перезапись на каждый ре-рендер мешала бы вводу — тот же класс проблемы, что и
  // у зависшего Suspense/контролируемых полей форматирования, см. .claude/docs/forms.md).
  useEffect(() => {
    if (value !== lastCommittedValue.current) {
      lastCommittedValue.current = value
      setText(formatValue(value))
    }
  }, [value])

  const decimalSeparator = getDecimalSeparator(locale)

  return (
    <input
      data-slot="number-input"
      role="spinbutton"
      type="text"
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      spellCheck="false"
      value={text}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value ?? undefined}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)

        if (raw.trim() === '') {
          lastCommittedValue.current = null
          onChange(null)
          return
        }

        const normalized = decimalSeparator === '.' ? raw : raw.split(decimalSeparator).join('.')
        const parsed = Number(normalized)
        if (!Number.isNaN(parsed)) {
          lastCommittedValue.current = parsed
          onChange(parsed)
        }
      }}
      onBlur={() => {
        // Незавершённый/невалидный черновик (например одинокое "-") на blur откатывается к
        // последнему принятому значению — так же, как раньше делал браузер сам для type="number".
        setText(formatValue(lastCommittedValue.current))
        onBlur?.()
      }}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      readOnly={readOnly}
      data-field-name={rest['data-field-name']}
      className={cn(
        'border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
      )}
    />
  )
}

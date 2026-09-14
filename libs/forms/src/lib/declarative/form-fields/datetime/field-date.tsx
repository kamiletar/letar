'use client'

import { Input } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { DateFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * Form.Field.Date - Date input field
 *
 * Renders a native date input with automatic form integration and error display.
 *
 * Automatically extracts from Zod schema:
 * - `min` from `z.date().min(new Date('2024-01-01'))` → min="2024-01-01"
 * - `max` from `z.date().max(new Date('2024-12-31'))` → max="2024-12-31"
 * - `helperText` automatically is generated from constraints ("From Jan 1, 2024 to Dec 31, 2024")
 *
 * Props always take priority over automatic values from schema.
 *
 * @example
 * ```tsx
 * <Form.Field.Date name="birthDate" label="Date of Birth" />
 * ```
 *
 * @example With automatic constraints from Zod
 * ```tsx
 * // In schema: z.object({ eventDate: z.date().min(new Date('2024-01-01')).max(new Date('2024-12-31')) })
 * <Form.Field.Date name="eventDate" label="Event Date" />
 * // Automatically: min="2024-01-01", max="2024-12-31"
 * ```
 */
export const FieldDate = createField<DateFieldProps, string | Date>({
  displayName: 'FieldDate',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { constraints } = resolved

    // Handle Date objects by converting to YYYY-MM-DD string
    const rawValue = field.state.value
    let stringValue = ''
    if (rawValue instanceof Date) {
      stringValue = rawValue.toISOString().split('T')[0]
    } else if (typeof rawValue === 'string') {
      stringValue = rawValue
    }

    // Коммитим Date только если схема реально требует Date (z.date()/z.coerce.date()) —
    // иначе строку YYYY-MM-DD. Без схемы вовсе (типичный Form.UrlSync-фильтр по дате,
    // defaults там строковые) constraints.schemaType не 'date', и поле безопасно
    // сравнивается с URL-дефолтом через === без стирания Date.toString() в query.
    // Разбор: .claude/docs/letar-forms-field-date-urlsync-date-object.md
    const requiresDateValue = constraints?.schemaType === 'date'

    // Props take priority over constraints
    const min = componentProps.min ?? constraints?.date?.min
    const max = componentProps.max ?? constraints?.date?.max

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <Input
          type="date"
          value={stringValue}
          onChange={(e) => {
            const raw = (e.target as HTMLInputElement).value
            // requiresDateValue=true: коммитим Date, а не строку из DOM — рантайм-значение
            // обязано совпадать с выведенным TS-типом поля (z.date()/z.coerce.date()), иначе
            // values.field.toISOString() падает в рантайме, а typecheck этого не ловит.
            // requiresDateValue=false (нет схемы или схема не date): коммитим строку —
            // см. requiresDateValue выше.
            field.handleChange(raw ? (requiresDateValue ? new Date(raw) : raw) : undefined)
          }}
          onBlur={field.handleBlur}
          placeholder={resolved.placeholder}
          min={min}
          max={max}
          data-field-name={fullPath}
        />
      </FieldWrapper>
    )
  },
})

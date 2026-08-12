'use client'

import { NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { cn } from '@letar/tailwind-utils'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import type { DateRangeFieldProps, DateRangePreset, DateRangeValue } from './types'

const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  thisWeek: 'Эта неделя',
  lastWeek: 'Прошлая неделя',
  thisMonth: 'Этот месяц',
  lastMonth: 'Прошлый месяц',
  thisYear: 'Этот год',
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getPresetRange(preset: DateRangePreset): DateRangeValue {
  const today = new Date()

  switch (preset) {
    case 'today':
      return { start: formatDate(today), end: formatDate(today) }
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      return { start: formatDate(yesterday), end: formatDate(yesterday) }
    }
    case 'thisWeek': {
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay() + 1)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'lastWeek': {
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay() - 6)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: formatDate(start), end: formatDate(end) }
    }
    case 'thisYear': {
      const start = new Date(today.getFullYear(), 0, 1)
      const end = new Date(today.getFullYear(), 11, 31)
      return { start: formatDate(start), end: formatDate(end) }
    }
  }
}

/**
 * Form.Field.DateRange — shadcn-скин.
 *
 * Beta-упрощение относительно Chakra-версии: пресеты — ряд обычных кнопок под инпутами, а не
 * выпадающее меню (`Menu.Root` из Chakra) — избегает новой Radix-зависимости
 * (`@radix-ui/react-dropdown-menu` ещё не установлена) ради 7 текстовых пунктов. Саб-лейблы
 * начала/конца — `<span>`, не связанный `<label htmlFor>` (`UIKitInputProps` не пропускает `id`
 * наружу — примитив не рассчитан на второй вложенный лейбл внутри одного поля; Chakra-версия
 * получает эту связь бесплатно через свой вложенный `Field.Root`+`Field.Label`, здесь такого
 * второго уровня в UIKit-контракте нет).
 */
export const FieldDateRange = createField<DateRangeFieldProps, DateRangeValue>({
  displayName: 'FieldDateRange',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const {
      startLabel = 'С',
      endLabel = 'По',
      min,
      max,
      presets,
      orientation = 'horizontal',
    } = componentProps

    const value = (field.state.value as DateRangeValue) ?? { start: '', end: '' }

    const handleStartChange = (newStart: string) => {
      field.handleChange({ ...value, start: newStart })
    }

    const handleEndChange = (newEnd: string) => {
      field.handleChange({ ...value, end: newEnd })
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div className={cn('flex gap-2', orientation === 'horizontal' ? 'flex-row' : 'flex-col')}>
          <div className="flex-1 space-y-1">
            <span className="text-muted-foreground text-sm">{startLabel}</span>
            <input
              type="date"
              value={value.start}
              onChange={(e) => handleStartChange(e.target.value)}
              onBlur={field.handleBlur}
              min={min}
              max={value.end || max}
              disabled={resolved.disabled}
              readOnly={resolved.readOnly}
              data-field-name={`${fullPath}.start`}
              className={NATIVE_INPUT_CLASS}
            />
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-muted-foreground text-sm">{endLabel}</span>
            <input
              type="date"
              value={value.end}
              onChange={(e) => handleEndChange(e.target.value)}
              onBlur={field.handleBlur}
              min={value.start || min}
              max={max}
              disabled={resolved.disabled}
              readOnly={resolved.readOnly}
              data-field-name={`${fullPath}.end`}
              className={NATIVE_INPUT_CLASS}
            />
          </div>
        </div>

        {presets && presets.length > 0 && !resolved.readOnly && (
          <div className="mt-2 flex flex-wrap gap-1">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={resolved.disabled}
                onClick={() => field.handleChange(getPresetRange(preset))}
                className={cn(
                  'border-input hover:bg-accent hover:text-accent-foreground rounded-md border px-2 py-1 text-xs',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                {PRESET_LABELS[preset]}
              </button>
            ))}
          </div>
        )}
      </FieldWrapper>
    )
  },
})

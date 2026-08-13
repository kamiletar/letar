import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { Star } from 'lucide-vue-next'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

/** Строка матрицы (вопрос) для `FieldMatrixChoice`. */
export interface MatrixRow {
  value: string
  label: string
}

/** Колонка матрицы (вариант ответа) для `FieldMatrixChoice`. */
export interface MatrixColumn {
  value: string
  label: string
}

/**
 * Таблица «вопрос × вариант ответа» (native `<table>`) — значение
 * `Record<string, string | string[]>`. `rows`/`columns` — пропы сверх контракта `createField`
 * (массивы объектов), поле собрано напрямую как `FieldRadioGroup`. Три варианта
 * (`radio`/`checkbox`/`rating`, звезда — `lucide-vue-next` `Star`, как в `FieldRating`), per-row
 * required-подсветка. Портировано из
 * `libs/forms-shadcn/src/lib/fields/field-matrix-choice.tsx` без изменений логики — те же
 * Tailwind-классы.
 */
export const FieldMatrixChoice = defineComponent({
  name: 'FieldMatrixChoice',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    rows: { type: Array as PropType<MatrixRow[]>, required: true },
    columns: { type: Array as PropType<MatrixColumn[]>, required: true },
    variant: { type: String as PropType<'radio' | 'checkbox' | 'rating'>, required: false, default: 'radio' },
    disabled: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    const renderError = ref<Error | null>(null)
    onErrorCaptured((error) => {
      renderError.value = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      return withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const value: Record<string, string | string[]> = (field.state.value as Record<string, string | string[]>)
          ?? {}

        const isSelected = (rowValue: string, colValue: string): boolean => {
          const rowVal = value[rowValue]
          if (props.variant === 'checkbox') {
            return Array.isArray(rowVal) && rowVal.includes(colValue)
          }
          return rowVal === colValue
        }

        const setRowValue = (rowValue: string, colValue: string) => {
          if (props.disabled) {
            return
          }
          if (props.variant === 'checkbox') {
            const current = (value[rowValue] as string[] | undefined) ?? []
            const next = current.includes(colValue) ? current.filter((v) => v !== colValue) : [...current, colValue]
            field.handleChange({ ...value, [rowValue]: next })
          } else {
            field.handleChange({ ...value, [rowValue]: colValue })
          }
        }

        const renderCell = (row: MatrixRow, col: MatrixColumn) => {
          const selected = isSelected(row.value, col.value)

          if (props.variant === 'checkbox') {
            return h('input', {
              type: 'checkbox',
              checked: selected,
              onChange: () => setRowValue(row.value, col.value),
              disabled: props.disabled,
              'aria-label': `${row.label}: ${col.label}`,
              class: 'size-4',
            })
          }

          if (props.variant === 'rating') {
            return h(
              'button',
              {
                type: 'button',
                disabled: props.disabled,
                onClick: () => setRowValue(row.value, col.value),
                'aria-label': `${row.label}: ${col.label}`,
                'aria-pressed': selected,
                class: cn(
                  'inline-flex',
                  selected ? 'text-yellow-400' : 'text-muted-foreground hover:text-yellow-400',
                  props.disabled && 'pointer-events-none opacity-50',
                ),
              },
              [h(Star, { class: cn('size-4', selected && 'fill-current') })],
            )
          }

          return h(
            'button',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': selected,
              disabled: props.disabled,
              onClick: () => setRowValue(row.value, col.value),
              'aria-label': `${row.label}: ${col.label}`,
              class: cn(
                'inline-flex size-[18px] items-center justify-center rounded-full border-2 transition-colors',
                selected ? 'border-primary bg-primary' : 'border-border bg-transparent',
                props.disabled && 'pointer-events-none opacity-50',
              ),
            },
            selected ? [h('span', { class: 'size-2 rounded-full bg-white' })] : [],
          )
        }

        return FieldWrapper({
          label,
          required,
          disabled: props.disabled,
          hasError,
          errorMessage,
          children: h('div', { class: 'overflow-x-auto', 'data-field-name': props.name }, [
            h('table', { class: 'w-full border-collapse text-sm' }, [
              h('thead', {}, [
                h('tr', {}, [
                  h('th', { class: 'w-2/5' }),
                  ...props.columns.map((col) =>
                    h(
                      'th',
                      { key: col.value, class: 'text-muted-foreground px-2 py-2 text-center font-medium' },
                      col.label,
                    )
                  ),
                ]),
              ]),
              h(
                'tbody',
                {},
                props.rows.map((row) => {
                  const rowValue = value[row.value]
                  const isRowEmpty = props.variant === 'checkbox'
                    ? !Array.isArray(rowValue) || rowValue.length === 0
                    : !rowValue
                  const showRowError = required && hasError && isRowEmpty

                  return h(
                    'tr',
                    { key: row.value, class: cn('border-t', showRowError && 'bg-destructive/5') },
                    [
                      h(
                        'td',
                        { class: cn('py-2 pr-3 font-medium', showRowError && 'text-destructive') },
                        row.label,
                      ),
                      ...props.columns.map((col) =>
                        h('td', { key: col.value, class: 'px-2 py-2 text-center' }, [renderCell(row, col)])
                      ),
                    ],
                  )
                }),
              ),
            ]),
          ]),
        })
      })
    }
  },
})

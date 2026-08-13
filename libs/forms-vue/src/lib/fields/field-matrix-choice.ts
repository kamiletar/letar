import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

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
 * Таблица «вопрос × вариант ответа» (headless) — значение `Record<string, string | string[]>`.
 * `rows`/`columns` — пропы сверх контракта `createField` (массивы объектов), поле собрано
 * напрямую как `FieldRadioGroup`. Три варианта (`radio`/`checkbox`/`rating`), per-row
 * required-подсветка. Портировано из `libs/forms-shadcn/src/lib/fields/field-matrix-choice.tsx`
 * без изменений логики.
 */
export const FieldMatrixChoice = defineComponent({
  name: 'FieldMatrixChoice',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    rows: { type: Array as PropType<MatrixRow[]>, required: true },
    columns: { type: Array as PropType<MatrixColumn[]>, required: true },
    variant: { type: String as PropType<'radio' | 'checkbox' | 'rating'>, required: false, default: 'radio' },
    disabled: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
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
              class: 'letar-field__matrix-checkbox',
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
                class: 'letar-field__matrix-rating',
                'data-selected': selected,
              },
              '★',
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
              class: 'letar-field__matrix-radio',
              'data-selected': selected,
            },
            selected ? [h('span', { class: 'letar-field__matrix-radio-dot' })] : [],
          )
        }

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h(
            'table',
            { class: 'letar-field__matrix', 'data-field-name': props.name },
            [
              h('thead', {}, [
                h('tr', {}, [
                  h('th', {}),
                  ...props.columns.map((col) => h('th', { key: col.value }, col.label)),
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
                    { key: row.value, 'data-row-error': showRowError },
                    [
                      h('td', { class: 'letar-field__matrix-row-label' }, row.label),
                      ...props.columns.map((col) => h('td', { key: col.value }, renderCell(row, col))),
                    ],
                  )
                }),
              ),
            ],
          ),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})

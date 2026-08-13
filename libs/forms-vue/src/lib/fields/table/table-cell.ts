import { formatCellValue } from '@letar/forms-core/table'
import { defineComponent, h, type PropType, ref } from 'vue'
import type { ResolvedColumn, TableEditorController } from '../../core/table-editor-types'

/** `errors` в состоянии поля `@tanstack/vue-form` — либо строка, либо `{ message }`, либо смесь. */
function hasFieldErrors(errors: unknown[]): boolean {
  return errors.length > 0
}

function formatFieldErrors(errors: unknown[]): string {
  return errors
    .map((e) => (typeof e === 'string' ? e : (e as { message?: string })?.message ?? ''))
    .filter(Boolean)
    .join(', ')
}

/**
 * Ячейка таблицы TableEditor — переключение display/edit по клику.
 *
 * Портировано из `libs/forms-shadcn/src/lib/table/table-cell.tsx`. Собственный компонент (не
 * функция рендера, вызываемая напрямую) — локальный буфер текста при редактировании (`localValue`)
 * должен переживать перерисовки, пока ячейка в режиме `isEditing`, а это в Vue гарантирует только
 * `ref()`, заведённый в `setup()` компонента с устойчивым `key` (см. `table-row.ts`).
 *
 * ⚠️ Автофокус сделан через `onVnodeMounted` конкретного `<input>`/`<select>`, а не через
 * `onMounted` из `setup()` — переключение `<td>` (текст) → `<input>` (редактирование) происходит
 * внутри render-замыкания, которое Vue выполняет не как часть `setup()`, а при каждом патче;
 * вызывать хуки жизненного цикла оттуда нельзя (нет активного instance). `onVnodeMounted` —
 * обычный проп vnode, ему активный instance не нужен, и он срабатывает ровно один раз при
 * монтировании конкретного DOM-узла — то есть именно в момент входа в режим редактирования (это
 * всегда новый vnode). Инициализация буфера при входе в редактирование — через плоскую переменную
 * `wasEditing` в замыкании `setup()` (не `ref`, не триггерит реактивность), синхронно до рендера
 * `<input>`, без лишнего тика на re-render.
 */
export const TableCell = defineComponent({
  name: 'TableEditorCell',
  props: {
    controller: { type: Object as PropType<TableEditorController>, required: true },
    rowIndex: { type: Number, required: true },
    colIndex: { type: Number, required: true },
    column: { type: Object as PropType<ResolvedColumn>, required: true },
    rowData: { type: Object as PropType<Record<string, unknown>>, required: true },
  },
  setup(props) {
    const localValue = ref('')
    const inputRef = ref<HTMLInputElement | HTMLSelectElement | null>(null)
    // Плоская (не reactive) переменная замыкания — отслеживает переход в режим редактирования
    // между вызовами возвращаемой render-функции, не триггерит собственную реактивность.
    let wasEditing = false

    return () => {
      const { controller, rowIndex, colIndex, column, rowData } = props
      const isEditing = controller.editingCell?.row === rowIndex && controller.editingCell?.col === colIndex
      const isComputed = !!column.computed
      const isReadOnly = controller.readOnly || column.readOnly || isComputed || controller.disabled
      const fieldPath = `${controller.fullPath}[${rowIndex}].${column.name}`

      const startEdit = () => {
        if (isReadOnly) {
          return
        }
        controller.setEditingCell({ row: rowIndex, col: colIndex })
      }

      const handleCellKeyDown = (e: KeyboardEvent) => {
        if (isReadOnly) {
          return
        }
        if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault()
          startEdit()
        }
      }

      if (isComputed) {
        const computedValue = column.computed?.(rowData)
        return h(
          'td',
          {
            class: [
              'letar-field__table-editor-cell',
              column.align === 'right' && 'letar-field__table-editor-cell--right',
              column.align === 'center' && 'letar-field__table-editor-cell--center',
            ],
            'data-row': rowIndex,
            'data-col': colIndex,
          },
          formatCellValue(computedValue, column),
        )
      }

      return h(
        controller.form.Field,
        { name: fieldPath },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form field slot-параметр
          default: ({ field }: { field: any }) => {
            const errors = (field.state.meta.errors ?? []) as unknown[]
            const hasError = hasFieldErrors(errors)
            const value = field.state.value

            if (isEditing) {
              // Синхронно, до рендера `<input>` — при первом рендере в режиме редактирования
              // (переход false → true) заполняем буфер текущим значением поля. Дальше при
              // каждом keystroke буфер обновляет сам `onInput`, значение поля этот эффект не
              // затирает (сеттер вызывается только на commit — blur/Escape).
              if (!wasEditing) {
                localValue.value = String(value ?? '')
              }
              wasEditing = true
              return renderEditingCell({
                column,
                value,
                hasError,
                errors,
                rowIndex,
                colIndex,
                inputRef,
                localValue,
                setEditingCell: controller.setEditingCell,
                onCommit: (next) => {
                  field.handleChange(next)
                  controller.setEditingCell(null)
                },
                onChange: (next) => field.handleChange(next),
              })
            }

            wasEditing = false

            return h(
              'td',
              {
                class: [
                  'letar-field__table-editor-cell',
                  column.align === 'right' && 'letar-field__table-editor-cell--right',
                  column.align === 'center' && 'letar-field__table-editor-cell--center',
                  !isReadOnly && 'letar-field__table-editor-cell--editable',
                  hasError && 'letar-field__table-editor-cell--error',
                ],
                'data-row': rowIndex,
                'data-col': colIndex,
                tabindex: isReadOnly ? undefined : 0,
                onClick: startEdit,
                onKeydown: handleCellKeyDown,
                onFocus: () => controller.setFocusedCell({ row: rowIndex, col: colIndex }),
                title: hasError ? formatFieldErrors(errors) : undefined,
              },
              formatCellValue(value, column)
                || h('span', { class: 'letar-field__table-editor-placeholder' }, column.placeholder ?? '—'),
            )
          },
        },
      )
    }
  },
})

interface EditingCellArgs {
  column: ResolvedColumn
  value: unknown
  hasError: boolean
  errors: unknown[]
  rowIndex: number
  colIndex: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vue Ref<HTMLInputElement | HTMLSelectElement | null>
  inputRef: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vue Ref<string>
  localValue: any
  setEditingCell: (cell: null) => void
  onCommit: (value: unknown) => void
  onChange: (value: unknown) => void
}

/** Фокус + выделение содержимого при монтировании конкретного DOM-узла ячейки. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- VNode с `.el` после монтирования
function focusOnMount(vnode: any) {
  const el = vnode.el as HTMLInputElement | HTMLSelectElement | null
  if (el) {
    el.focus()
    if ('select' in el) {
      ;(el as HTMLInputElement).select()
    }
  }
}

/** Ячейка в режиме редактирования — enum → `<select>`, boolean → чекбокс, иначе текст/число. */
function renderEditingCell(args: EditingCellArgs) {
  const {
    column,
    value,
    hasError,
    errors,
    rowIndex,
    colIndex,
    inputRef,
    localValue,
    setEditingCell,
    onCommit,
    onChange,
  } = args

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setEditingCell(null)
    }
    // Tab/Enter — пусть всплывает, обработается use-table-navigation на контейнере
  }

  const errorTitle = hasError ? formatFieldErrors(errors) : undefined

  if (column.fieldType === 'enum' && column.enumValues) {
    return h(
      'td',
      { 'data-row': rowIndex, 'data-col': colIndex, class: 'letar-field__table-editor-cell--edit' },
      [
        h(
          'select',
          {
            ref: inputRef,
            value: String(value ?? ''),
            onChange: (e: Event) => onChange((e.target as HTMLSelectElement).value),
            onBlur: () => onCommit(value),
            onKeydown: handleKeyDown,
            onVnodeMounted: focusOnMount,
            class: ['letar-field__table-editor-input', hasError && 'letar-field__table-editor-input--error'],
          },
          [
            h('option', { value: '' }, '—'),
            ...column.enumValues.map((v) => h('option', { key: v, value: v }, v)),
          ],
        ),
      ],
    )
  }

  if (column.fieldType === 'boolean') {
    return h('td', { 'data-row': rowIndex, 'data-col': colIndex, class: 'letar-field__table-editor-cell--center' }, [
      h('input', {
        ref: inputRef,
        type: 'checkbox',
        checked: !!value,
        onChange: (e: Event) => {
          const checked = (e.target as HTMLInputElement).checked
          onChange(checked)
          onCommit(checked)
        },
        onKeydown: handleKeyDown,
        onVnodeMounted: focusOnMount,
        class: 'letar-field__table-editor-checkbox',
      }),
    ])
  }

  const inputType = column.fieldType === 'number' ? 'number' : 'text'

  return h(
    'td',
    { 'data-row': rowIndex, 'data-col': colIndex, class: 'letar-field__table-editor-cell--edit' },
    [
      h('input', {
        ref: inputRef,
        type: inputType,
        value: localValue.value,
        onVnodeMounted: focusOnMount,
        onInput: (e: Event) => {
          localValue.value = (e.target as HTMLInputElement).value
        },
        onBlur: () => {
          const coerced = column.fieldType === 'number' ? Number(localValue.value) || 0 : localValue.value
          onCommit(coerced)
        },
        onKeydown: handleKeyDown,
        title: errorTitle,
        class: [
          'letar-field__table-editor-input',
          column.align === 'right' && 'letar-field__table-editor-input--right',
          column.align === 'center' && 'letar-field__table-editor-input--center',
          hasError && 'letar-field__table-editor-input--error',
        ],
      }),
    ],
  )
}

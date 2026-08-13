import { formatCellValue } from '@letar/forms-core/table'
import type { ResolvedColumn, TableEditorController } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h, type PropType, ref } from 'vue'

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

/**
 * Ячейка таблицы TableEditor (Reka/Tailwind-скин) — переключение display/edit по клику.
 * Портировано из `libs/forms-shadcn/src/lib/table/table-cell.tsx`. Логика идентична headless-
 * версии (`libs/forms-vue/src/lib/fields/table/table-cell.ts`), отличается только разметка —
 * см. подробный разбор `onVnodeMounted`/`wasEditing` в headless-версии, здесь тот же паттерн.
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
    let wasEditing = false

    return () => {
      const { controller, rowIndex, colIndex, column, rowData } = props
      const isEditing = controller.editingCell?.row === rowIndex && controller.editingCell?.col === colIndex
      const isComputed = !!column.computed
      const isReadOnly = controller.readOnly || column.readOnly || isComputed || controller.disabled
      const fieldPath = `${controller.fullPath}[${rowIndex}].${column.name}`

      const cellClass = (hasError: boolean) =>
        cn(
          'p-2 align-middle',
          column.align === 'right' && 'text-right',
          column.align === 'center' && 'text-center',
          !isReadOnly && 'cursor-pointer hover:bg-muted/50',
          hasError && 'border border-destructive',
        )

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
          { class: cellClass(false), 'data-row': rowIndex, 'data-col': colIndex },
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
                class: cellClass(hasError),
                'data-row': rowIndex,
                'data-col': colIndex,
                tabindex: isReadOnly ? undefined : 0,
                onClick: startEdit,
                onKeydown: handleCellKeyDown,
                onFocus: () => controller.setFocusedCell({ row: rowIndex, col: colIndex }),
                title: hasError ? formatFieldErrors(errors) : undefined,
              },
              formatCellValue(value, column)
                || h('span', { class: 'opacity-40' }, column.placeholder ?? '—'),
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

const inputClass = (hasError: boolean, align?: 'left' | 'center' | 'right') =>
  cn(
    'h-9 w-full border-0 bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
    align === 'right' && 'text-right',
    align === 'center' && 'text-center',
    hasError && 'ring-2 ring-destructive',
  )

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
    return h('td', { 'data-row': rowIndex, 'data-col': colIndex, class: 'p-0' }, [
      h(
        'select',
        {
          ref: inputRef,
          value: String(value ?? ''),
          onChange: (e: Event) => onChange((e.target as HTMLSelectElement).value),
          onBlur: () => onCommit(value),
          onKeydown: handleKeyDown,
          onVnodeMounted: focusOnMount,
          class: inputClass(hasError),
        },
        [
          h('option', { value: '' }, '—'),
          ...column.enumValues.map((v) => h('option', { key: v, value: v }, v)),
        ],
      ),
    ])
  }

  if (column.fieldType === 'boolean') {
    return h('td', { 'data-row': rowIndex, 'data-col': colIndex, class: 'p-0 text-center' }, [
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
        class: 'size-4 cursor-pointer',
      }),
    ])
  }

  const inputType = column.fieldType === 'number' ? 'number' : 'text'

  return h('td', { 'data-row': rowIndex, 'data-col': colIndex, class: 'p-0' }, [
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
      class: inputClass(hasError, column.align),
    }),
  ])
}

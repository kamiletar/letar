import { defineComponent, h, type PropType, ref } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

/**
 * Клик по превью переключает в режим редактирования. Beta (как у React-версии): `submitOnBlur`
 * (по умолчанию true) + Enter/Escape вместо отдельного набора Cancel/Submit/Edit-кнопок,
 * `activationMode` — только `click` (по умолчанию) и `none`. Портирован из
 * `forms-shadcn/field-editable.tsx`.
 */
export const FieldEditable = defineComponent({
  name: 'FieldEditable',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    multiline: { type: Boolean, required: false, default: false },
    activationMode: { type: String as PropType<'click' | 'none'>, required: false, default: 'click' },
    submitOnBlur: { type: Boolean, required: false, default: true },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const isEditing = ref(props.activationMode === 'none')

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const currentValue = (field.state.value as string) ?? ''

        const commit = () => {
          if (props.activationMode !== 'none') { isEditing.value = false }
          field.handleBlur()
        }

        if (!isEditing.value) {
          return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
            label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
            h('button', {
              type: 'button',
              class: 'letar-field__editable-preview',
              'data-field-name': props.name,
              onClick: () => (isEditing.value = true),
            }, currentValue || placeholder || 'Нажмите для редактирования'),
            hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
          ])
        }

        const sharedProps = {
          value: currentValue,
          placeholder,
          class: 'letar-field__control',
          'data-field-name': props.name,
          onInput: (e: Event) => field.handleChange((e.target as HTMLInputElement | HTMLTextAreaElement).value),
          onBlur: () => {
            if (props.submitOnBlur) { commit() }
          },
          onKeydown: (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !props.multiline) { commit() }
            if (e.key === 'Escape') { isEditing.value = props.activationMode === 'none' }
          },
        }

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          props.multiline
            ? h('textarea', { ...sharedProps, rows: 3 })
            : h('input', { ...sharedProps, type: 'text' }),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})

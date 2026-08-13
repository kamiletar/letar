import { defineComponent, h, ref } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

/**
 * Тег-инпут — `string[]`, Enter добавляет тег, Backspace на пустом драфте удаляет последний.
 * Не через `createField` — нужен локальный `ref` черновика ввода сверх стандартного контракта
 * (тот же повод, что у `FieldSelect`/`FieldRadioGroup`: собственные пропы + своё состояние).
 * Портирован из `forms-shadcn/field-tags.tsx` (логика 1:1, вёрстка — голая).
 */
export const FieldTags = defineComponent({
  name: 'FieldTags',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    maxTags: { type: Number, required: false, default: undefined },
    minTagLength: { type: Number, required: false, default: 1 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const draft = ref('')

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const tags = (field.state.value as string[]) ?? []

        const addTag = (raw: string) => {
          const trimmed = raw.trim()
          if (trimmed.length < props.minTagLength) { return }
          if (props.maxTags && tags.length >= props.maxTags) { return }
          if (tags.includes(trimmed)) { return }
          field.handleChange([...tags, trimmed])
          draft.value = ''
        }

        const removeTag = (index: number) => {
          field.handleChange(tags.filter((_: string, i: number) => i !== index))
        }

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h('div', { class: 'letar-field__tags', 'data-field-name': props.name }, [
            ...tags.map((tag, index) =>
              h('span', { key: tag, class: 'letar-field__tag' }, [
                tag,
                h('button', {
                  type: 'button',
                  'aria-label': `Удалить ${tag}`,
                  onClick: () => removeTag(index),
                }, '×'),
              ])
            ),
            h('input', {
              class: 'letar-field__control letar-field__tags-input',
              value: draft.value,
              placeholder: tags.length === 0 ? placeholder : undefined,
              onInput: (e: Event) => (draft.value = (e.target as HTMLInputElement).value),
              onKeydown: (e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag(draft.value)
                }
                if (e.key === 'Backspace' && !draft.value && tags.length > 0) {
                  removeTag(tags.length - 1)
                }
              },
              onBlur: field.handleBlur,
            }),
          ]),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})

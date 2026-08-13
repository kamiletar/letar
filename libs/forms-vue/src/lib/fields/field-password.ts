import { defineComponent, h, ref } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

/** Пароль с переключателем видимости — локальное состояние `visible`, которого нет в `createField`. */
export const FieldPassword = defineComponent({
  name: 'FieldPassword',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    defaultVisible: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const visible = ref(props.defaultVisible)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) =>
        fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('div', { class: 'letar-field__password-group' }, [
            h('input', {
              id: props.name,
              name: props.name,
              class: 'letar-field__control',
              type: visible.value ? 'text' : 'password',
              placeholder,
              value: (field.state.value as string) ?? '',
              onInput: (event: Event) => field.handleChange((event.target as HTMLInputElement).value),
              onBlur: field.handleBlur,
            }),
            h('button', {
              type: 'button',
              class: 'letar-field__password-toggle',
              'aria-label': 'Toggle password visibility',
              onClick: () => {
                visible.value = !visible.value
              },
            }, visible.value ? 'Скрыть' : 'Показать'),
          ]),
        ))
  },
})

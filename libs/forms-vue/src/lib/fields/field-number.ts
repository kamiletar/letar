import { h } from 'vue'
import { createField } from '../create-field'
import { fieldWrapper } from './field-utils'

export const FieldNumber = createField('FieldNumber', (args) =>
  fieldWrapper(
    args,
    h('input', {
      id: args.name,
      name: args.name,
      class: 'letar-field__control',
      type: 'number',
      placeholder: args.placeholder,
      value: args.field.state.value,
      onInput: (event: Event) => {
        const raw = (event.target as HTMLInputElement).value
        args.field.handleChange(raw === '' ? undefined : Number(raw))
      },
      onBlur: args.field.handleBlur,
    }),
  ))

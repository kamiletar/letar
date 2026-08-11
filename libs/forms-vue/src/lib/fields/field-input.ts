import { h } from 'vue'
import { createField } from '../create-field'
import { fieldWrapper } from './field-utils'

export const FieldInput = createField('FieldInput', (args) =>
  fieldWrapper(
    args,
    h('input', {
      id: args.name,
      name: args.name,
      class: 'letar-field__control',
      type: 'text',
      placeholder: args.placeholder,
      value: args.field.state.value,
      onInput: (event: Event) => args.field.handleChange((event.target as HTMLInputElement).value),
      onBlur: args.field.handleBlur,
    }),
  ))

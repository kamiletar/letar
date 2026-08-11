import { h } from 'vue'
import { createField } from '../create-field'
import { fieldWrapper } from './field-utils'

export const FieldTextarea = createField('FieldTextarea', (args) =>
  fieldWrapper(
    args,
    h('textarea', {
      id: args.name,
      name: args.name,
      class: 'letar-field__control',
      placeholder: args.placeholder,
      value: args.field.state.value,
      onInput: (event: Event) => args.field.handleChange((event.target as HTMLTextAreaElement).value),
      onBlur: args.field.handleBlur,
    }),
  ))

import { h } from 'vue'
import { createField } from '../create-field'

/** Чекбокс — метка стоит справа от контрола, а не сверху, отсюда свой мини-layout. */
export const FieldCheckbox = createField(
  'FieldCheckbox',
  (args) =>
    h('div', { class: 'letar-field', 'data-field-name': args.name }, [
      h('label', { class: 'letar-field__checkbox-label' }, [
        h('input', {
          id: args.name,
          name: args.name,
          class: 'letar-field__control',
          type: 'checkbox',
          checked: Boolean(args.field.state.value),
          onChange: (event: Event) => args.field.handleChange((event.target as HTMLInputElement).checked),
          onBlur: args.field.handleBlur,
        }),
        args.label ? `${args.label}${args.required ? ' *' : ''}` : null,
      ]),
      args.hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, args.errorMessage) : null,
    ]),
)

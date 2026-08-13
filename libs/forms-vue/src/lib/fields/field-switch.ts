import { h } from 'vue'
import { createField } from '../core/create-field'

/** Тумблер — тот же макет, что у `FieldCheckbox` (метка справа), с `role="switch"` для семантики. */
export const FieldSwitch = createField(
  'FieldSwitch',
  (args) =>
    h('div', { class: 'letar-field', 'data-field-name': args.name }, [
      h('label', { class: 'letar-field__switch-label' }, [
        h('input', {
          id: args.name,
          name: args.name,
          class: 'letar-field__control letar-field__switch',
          type: 'checkbox',
          role: 'switch',
          checked: Boolean(args.field.state.value),
          onChange: (event: Event) => args.field.handleChange((event.target as HTMLInputElement).checked),
          onBlur: args.field.handleBlur,
        }),
        args.label ? `${args.label}${args.required ? ' *' : ''}` : null,
      ]),
      args.hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, args.errorMessage) : null,
    ]),
)

import { h, type VNode } from 'vue'
import type { FieldRenderArgs } from '../create-field'

/** Общая обвязка Label → Control → Error, без UIKit-абстракции — см. заметку в create-field.ts. */
export function fieldWrapper(
  args: Pick<FieldRenderArgs, 'name' | 'label' | 'required' | 'hasError' | 'errorMessage'>,
  control: VNode,
): VNode {
  return h('div', { class: 'letar-field', 'data-field-name': args.name }, [
    args.label
      ? h('label', { class: 'letar-field__label', for: args.name }, `${args.label}${args.required ? ' *' : ''}`)
      : null,
    control,
    args.hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, args.errorMessage) : null,
  ])
}

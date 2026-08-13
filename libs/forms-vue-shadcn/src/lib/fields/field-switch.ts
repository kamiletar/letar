import { cn } from '@letar/tailwind-utils'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { h } from 'vue'
import { createField } from '../uikit/primitives'

/**
 * Тумблер — `reka-ui` `SwitchRoot`/`SwitchThumb`, не входит в `UIKitExtendedPrimitives`
 * (нет `Switch` в контракте) — рисуется напрямую внутри своей вёрстки, как и в React-скине
 * (`forms-shadcn/field-switch.tsx`), не через `FieldWrapper` (метка стоит справа от тумблера,
 * не сверху отдельной строкой).
 */
export const FieldSwitch = createField(
  'FieldSwitch',
  ({ field, name, label, hasError, errorMessage }) =>
    h('div', { class: 'space-y-2' }, [
      h('label', { class: 'flex items-center gap-2' }, [
        h(
          SwitchRoot,
          {
            'data-slot': 'switch',
            modelValue: !!field.state.value,
            'onUpdate:modelValue': ((checked: unknown) => field.handleChange(checked === true)) as (
              value: unknown,
            ) => void,
            onBlur: field.handleBlur,
            'data-field-name': name,
            class: cn(
              'bg-input focus-visible:ring-ring/50 peer inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none transition-colors',
              'data-[state=checked]:bg-primary',
              'focus-visible:ring-[3px]',
            ),
          },
          {
            default: () =>
              h(SwitchThumb, {
                class: cn(
                  'bg-background block size-4 rounded-full shadow-lg transition-transform',
                  'translate-x-0.5 data-[state=checked]:translate-x-4',
                ),
              }),
          },
        ),
        label ? h('span', { class: 'text-sm' }, label) : null,
      ]),
      hasError ? h('p', { class: 'text-destructive text-sm', role: 'alert' }, errorMessage) : null,
    ]),
)

import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { fieldWrapper } from './field-utils'

const DEFAULT_SWATCHES = [
  '#000000',
  '#4A5568',
  '#F56565',
  '#ED64A6',
  '#9F7AEA',
  '#6B46C1',
  '#4299E1',
  '#0BC5EA',
  '#38B2AC',
  '#48BB78',
  '#ECC94B',
  '#DD6B20',
]

/**
 * FieldColorPicker (headless) — Vue-идиоматичное упрощение относительно Chakra `ColorPicker.Root`
 * (Ark UI compound-компонент с area/hue/alpha слайдерами, `libs/forms/.../field-color-picker.tsx`):
 * нативный `<input type="color">` (браузерный пикер уже даёт area+sliders бесплатно) + текстовый
 * hex-инпут для точного значения + палитра свотчей. Решение согласовано с духом Фазы 9 —
 * не буквальное копирование React, где нативная платформенная возможность закрывает то же самое.
 */
export const FieldColorPicker = defineComponent({
  name: 'FieldColorPicker',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    swatches: { type: Array as PropType<string[]>, required: false, default: () => DEFAULT_SWATCHES },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as string) || '#000000'

        return fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('div', { class: 'letar-field__color-picker' }, [
            h('div', { class: 'letar-field__color-picker-row' }, [
              h('input', {
                type: 'color',
                value,
                class: 'letar-field__color-swatch-input',
                onInput: (e: Event) => field.handleChange((e.target as HTMLInputElement).value),
                onBlur: field.handleBlur,
                'data-field-name': props.name,
              }),
              h('input', {
                type: 'text',
                value,
                class: 'letar-field__control letar-field__color-hex',
                onChange: (e: Event) => field.handleChange((e.target as HTMLInputElement).value),
                onBlur: field.handleBlur,
              }),
            ]),
            props.swatches.length > 0
              ? h(
                'div',
                { class: 'letar-field__color-swatches' },
                props.swatches.map((swatch) =>
                  h('button', {
                    key: swatch,
                    type: 'button',
                    'aria-label': swatch,
                    'data-selected': swatch.toLowerCase() === value.toLowerCase(),
                    class: 'letar-field__color-swatch',
                    style: { backgroundColor: swatch },
                    onClick: () => field.handleChange(swatch),
                  })
                ),
              )
              : null,
          ]),
        )
      })
  },
})

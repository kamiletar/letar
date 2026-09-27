import { type ComponentPublicInstance, defineComponent, h, type PropType, type VNode } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { useListboxPopup } from '../core/use-listbox-popup'
import { fieldWrapper } from './field-utils'

export interface FieldSelectOption {
  value: string
  label: string
  /** Вторая строка в опции списка — видна только в кастомном рендере, нативный `<select>` её не показывал */
  description?: string
  disabled?: boolean
}

/** Состояние опции, которое получает `renderOption` — вместе с самой опцией */
export interface SelectOptionRenderState {
  /** Опция совпадает с текущим значением поля */
  selected: boolean
  /** Опция подсвечена клавиатурной навигацией (аналог `:hover`/`aria-activedescendant`) */
  active: boolean
}

/**
 * Кастомный узел вместо стандартного текста опции/значения. `undefined`/`null`/`''` — сигнал
 * «ничего не рисуй сам, используй запасной текст» (та же семантика, что у React-эталона
 * `forms-shadcn`): для `renderValue` запасной текст — `label` выбранной опции.
 */
type CustomRenderResult = VNode | string | null

/**
 * Select — единственное поле из пяти, которому нужен проп сверх `name`/`label`/`placeholder`
 * (`options`), поэтому оно не построено через `createField` (та фабрика — под однородный
 * набор пропсов пяти остальных полей), а собрано напрямую по тому же контракту контекста.
 *
 * Этап 3d паритета Select/Combobox (`forms-vue-angular-select-parity`): нативный `<select>`/
 * `<option>` заменён на кастомный listbox-попап поверх headless-примитива `useListboxPopup`
 * (`../core/use-listbox-popup.ts`) — нативный элемент физически не может показать кастомный
 * рендер опции, вторую строку описания или кастомное значение. `forms-vue` — headless-скин без
 * сторонней UI-библиотеки (в отличие от `forms-vue-shadcn`, который тот же примитив оборачивает
 * в Reka UI), поэтому разметка — голые `<button role="combobox">` + `<ul role="listbox">` с
 * `<li role="option">`, минимум классов (`letar-field__select-*`), без иконок.
 *
 * У `forms-vue` нет проблемы `forms-vue-shadcn` с `value=""` (там её создаёт Reka `SelectItem`,
 * запрещающий пустое значение) — опция с пустым значением работает как любая другая, служебный
 * `EMPTY_OPTION_TOKEN` не нужен.
 */
export const FieldSelect = defineComponent({
  name: 'FieldSelect',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<FieldSelectOption[]>, required: true },
    /** Кастомный рендер опции в списке — по умолчанию рисуются `label` + `description` */
    renderOption: {
      type: Function as PropType<(option: FieldSelectOption, state: SelectOptionRenderState) => CustomRenderResult>,
      required: false,
      default: undefined,
    },
    /** Кастомный рендер подписи триггера — по умолчанию `label` выбранной опции */
    renderValue: {
      type: Function as PropType<(option: FieldSelectOption) => CustomRenderResult>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )

    // `useListboxPopup` — композабл с хуками жизненного цикла (`onMounted`/`onBeforeUnmount`),
    // обязан вызываться синхронно из `setup()`, а не из render-замыкания `withFieldValidation`
    // (тот выполняется как slot-функция `form.Field`, вне контекста текущего компонента). Поэтому
    // `field` не передаётся напрямую в `onSelect`/`selectedValue` — они читают его из переменной,
    // которую render-замыкание обновляет на каждый свой вызов; к моменту реального клика/нажатия
    // клавиши (событие DOM, всегда после рендера) переменная уже указывает на актуальный `field`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form field API, тип неэкспортируем
    let currentField: any = null

    const popup = useListboxPopup<FieldSelectOption>({
      options: () => props.options,
      onSelect: (option) => currentField?.handleChange(option.value),
      selectedValue: () => currentField?.state.value as string | undefined,
      idBase: fullPath,
    })

    const listboxId = `${fullPath}-listbox`

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        currentField = field
        const currentValue = field.state.value as string | undefined
        const selectedOption = props.options.find((opt) => opt.value === currentValue)

        const triggerContent: CustomRenderResult = selectedOption
          ? (props.renderValue?.(selectedOption) || selectedOption.label)
          : (placeholder ?? '')

        return fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('div', { class: 'letar-field__select', 'data-field-name': props.name }, [
            h(
              'button',
              {
                type: 'button',
                id: props.name,
                ref: popup.triggerRef,
                class: 'letar-field__control letar-field__select-trigger',
                role: 'combobox',
                'aria-haspopup': 'listbox',
                'aria-expanded': popup.isOpen.value,
                'aria-controls': listboxId,
                'aria-activedescendant': popup.activeDescendantId.value,
                'data-placeholder': selectedOption ? undefined : '',
                onClick: () => popup.togglePopup(),
                onKeydown: popup.onKeydown,
                onBlur: () => {
                  popup.closePopup()
                  field.handleBlur()
                },
              },
              triggerContent,
            ),
            popup.isOpen.value
              ? h(
                'ul',
                {
                  // Обёртка, а не `popup.floatingRef` напрямую: сигнатура ref-колбэка Vue —
                  // `(el: Element | ComponentPublicInstance | null, refs) => void`, шире, чем
                  // `(el: HTMLElement | null) => void` у `attachFloating` — под `strictFunctionTypes`
                  // узкий параметр не проходит контравариантную проверку без явного каста. Элемент
                  // всегда `<ul>` (не компонент), поэтому каст на `HTMLElement` безопасен.
                  ref: (el: Element | ComponentPublicInstance | null) => popup.floatingRef(el as HTMLElement | null),
                  id: listboxId,
                  role: 'listbox',
                  class: 'letar-field__select-listbox',
                  style: popup.floatingStyles,
                },
                props.options.map((option, index) => {
                  const selected = option.value === currentValue
                  const active = index === popup.activeIndex.value
                  // Всегда массив (не «одиночное значение либо массив») — смешанный union путал
                  // разрешение перегрузок `h()` при передаче третьим аргументом.
                  const content: (VNode | string | null)[] = props.renderOption
                    ? [props.renderOption(option, { selected, active })]
                    : [
                      h('span', { class: 'letar-field__select-option-label' }, option.label),
                      option.description
                        ? h('span', { class: 'letar-field__select-option-description' }, option.description)
                        : null,
                    ]

                  return h(
                    'li',
                    {
                      key: option.value,
                      id: popup.optionId(index),
                      role: 'option',
                      'aria-selected': selected,
                      'aria-disabled': option.disabled || undefined,
                      'data-active': active || undefined,
                      class: 'letar-field__select-option',
                      // `preventDefault` на mousedown — фокус остаётся на кнопке-триггере, `blur`
                      // (который иначе закрыл бы попап раньше, чем сработает `click`) не срабатывает
                      onMousedown: (event: Event) => event.preventDefault(),
                      onClick: () => {
                        if (option.disabled) {
                          return
                        }
                        popup.selectIndex(index)
                      },
                      onMouseenter: () => {
                        if (!option.disabled) {
                          popup.activeIndex.value = index
                        }
                      },
                    },
                    content,
                  )
                }),
              )
              : null,
          ]),
        )
      })
  },
})

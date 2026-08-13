import { defineComponent, h } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { type MaskFieldFormatMode, useMaskField } from '../core/use-mask-field'
import { fieldWrapper } from './field-utils'

/**
 * Конфигурация для `createDocumentField` — фабрика документных полей (headless), Vue-аналог
 * `libs/forms-shadcn/src/lib/fields/document-field-base.tsx`.
 */
export interface DocumentFieldConfig {
  /** Имя компонента (Vue devtools) */
  displayName: string
  /** Маска движка `@letar/forms-core/mask` (9=цифра, a=буква, *=любой) */
  mask: string
  /**
   * `'live'` (по умолчанию) — группировка литералами маски на каждое нажатие. `'off'` — только
   * фильтрация по алфавиту токенов, без группировки: для полей переменной длины (ИНН — 10 или
   * 12 цифр), где структурная маска дала бы ложный отказ.
   */
  formatMode?: MaskFieldFormatMode
  /** HTML `maxLength` — актуален вместе с `formatMode: 'off'`, где сама маска длину не ограничивает. */
  maxLength?: number
  /** Placeholder с примером */
  placeholder: string
  /** Функция валидации значения (возвращает сообщение об ошибке или undefined) */
  validate?: (value: string) => string | undefined
}

/**
 * Фабрика документных полей — headless-скин (Этап 3, Фаза 9). `useMaskField` вызван в `setup()`
 * (не в render-замыкании) — обязательное условие стабильности `inputRef`, см. комментарий в
 * `use-mask-field.ts`.
 */
export function createDocumentField(config: DocumentFieldConfig) {
  return defineComponent({
    name: config.displayName,
    props: {
      name: { type: String, required: true },
      label: { type: String, required: false, default: undefined },
    },
    setup(props) {
      const { form, schema } = useAppFormContext()
      const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

      const getValue = () => (form.getFieldValue(props.name) as string | undefined) ?? ''
      const { uncontrolled, displayValue, inputRef, onInput, onFocus, onBlur } = useMaskField({
        mask: config.mask,
        getValue,
        onValueChange: (raw) => form.setFieldValue(props.name, raw),
        formatMode: config.formatMode,
      })

      return () =>
        withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
          const customError = config.validate ? config.validate(String(field.state.value ?? '')) : undefined
          const showError = hasError || !!customError
          const displayError = customError ?? errorMessage

          return fieldWrapper(
            { name: props.name, label, required, hasError: showError, errorMessage: displayError },
            h('input', {
              ref: inputRef,
              id: props.name,
              class: 'letar-field__control',
              placeholder: config.placeholder,
              maxlength: config.maxLength,
              ...(uncontrolled ? {} : { value: displayValue.value, onInput }),
              onFocus,
              onBlur: () => {
                onBlur()
                field.handleBlur()
              },
              'data-field-name': props.name,
            }),
          )
        })
    },
  })
}

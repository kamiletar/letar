import type { UIKitCorePrimitives, UIKitExtendedPrimitives } from '@letar/forms-core/uikit'
import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { defineComponent, onErrorCaptured, type PropType, ref } from 'vue'
import type { UINode } from '../uikit/ui-node'

/**
 * Тот минимум UIKit-контракта, без которого композиционный слой не может собрать поле —
 * Vue-аналог `FieldPrimitivesUIKit` из `@letar/forms-react`.
 */
export type FieldPrimitivesUIKit =
  & Pick<UIKitCorePrimitives<UINode>, 'FieldRoot' | 'FieldLabel' | 'FieldError'>
  & Required<Pick<UIKitExtendedPrimitives<UINode>, 'ErrorFallback'>>

export interface FieldRenderArgs {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form field API, тип из forms-vue
  field: any
  name: string
  label?: string
  placeholder?: string
  required: boolean
  hasError: boolean
  errorMessage: string
}

export type FieldRenderFn = (args: FieldRenderArgs) => UINode

export interface FieldWrapperProps {
  label?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  hasError: boolean
  errorMessage?: string
  children: UINode
}

export interface FieldPrimitives {
  createField: (displayName: string, render: FieldRenderFn) => ReturnType<typeof defineComponent>
  FieldWrapper: (props: FieldWrapperProps) => UINode
}

/**
 * Фабрика композиционного слоя поля, связанная с конкретной реализацией UIKit.
 *
 * Аналог `createFieldPrimitives` из `@letar/forms-react` (Фаза 7.3) — но не копия 1:1: React
 * ловит ошибки рендера отдельного поля через классовый `ErrorBoundary`
 * (`getDerivedStateFromError`/`componentDidCatch` — паттерн, которого в Vue нет). Здесь та же
 * задача решена идиоматично для Composition API — хуком `onErrorCaptured` прямо в `setup()`
 * компонента поля, без отдельного класса-обёртки.
 *
 * Разбор Zod-меты и обёртка `form.Field` (`resolveFieldMeta`/`withFieldValidation`) —
 * переиспользованы из `@letar/forms-vue/core` (Фаза 9), не дублированы: та же логика нужна
 * простым полям headless-пакета, а раньше была скопирована сюда дословно.
 */
export function createFieldPrimitives(uikit: FieldPrimitivesUIKit): FieldPrimitives {
  const FieldWrapper = (
    { label, required, disabled, readOnly, hasError, errorMessage, children }: FieldWrapperProps,
  ): UINode =>
    uikit.FieldRoot({
      invalid: hasError,
      required,
      disabled,
      readOnly,
      // Контракт типизирует `children` как единичный `TNode` — на практике каждый адаптер,
      // рисующий несколько дочерних узлов (как здесь: метка + контрол + ошибка), передаёт
      // массив, и рантайм (`h('div', {...}, children)` в `FieldRoot`) с этим не спорит.
      children: [
        uikit.FieldLabel({ label, required }),
        children,
        uikit.FieldError({ hasError, errorMessage }),
      ] as unknown as UINode,
    })

  function createField(displayName: string, render: FieldRenderFn) {
    return defineComponent({
      name: displayName,
      props: {
        name: { type: String, required: true },
        label: { type: String as PropType<string | undefined>, required: false, default: undefined },
        placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
      },
      setup(props) {
        const { form, schema } = useAppFormContext()
        const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
          schema,
          props.name,
          props.label,
          props.placeholder,
        )

        // Ошибка рендера внутри render() поля не должна класть всю форму — fallback вместо
        // краша, как и в React-версии, но через нативный Vue-механизм.
        const renderError = ref<Error | null>(null)
        onErrorCaptured((error) => {
          renderError.value = error instanceof Error ? error : new Error(String(error))
          console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
          return false
        })

        return () => {
          if (renderError.value) {
            return uikit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
          }

          return withFieldValidation(
            form,
            fullPath,
            fieldSchema,
            (field, hasError, errorMessage) =>
              render({ field, name: props.name, label, placeholder, required, hasError, errorMessage }),
          )
        }
      },
    })
  }

  return { createField, FieldWrapper }
}

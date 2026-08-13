import { getFieldMeta } from '@letar/forms-core/schema'
import { h, type VNode } from 'vue'
import type { ZodType } from 'zod'

/**
 * Метаданные поля, вычисленные из Zod-схемы (`.meta({ ui: {...} })`) + пропы явного
 * переопределения. Общая часть `createField` (`@letar/forms-vue`) и `createFieldPrimitives`
 * (`@letar/forms-vue-shadcn`) — раньше дублировалась в обоих пакетах дословно.
 */
export interface ResolvedFieldMeta {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-подсхема без публичного .shape в типах
  fieldSchema: any
  label: string | undefined
  placeholder: string | undefined
  required: boolean
}

export function resolveFieldMeta(
  schema: ZodType,
  name: string,
  label: string | undefined,
  placeholder: string | undefined,
): ResolvedFieldMeta {
  const meta = getFieldMeta(schema, name)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-объект без публичного .shape в типах
  const fieldSchema = (schema as any).shape?.[name]

  return {
    fieldSchema,
    label: label ?? meta.ui?.title,
    placeholder: placeholder ?? meta.ui?.placeholder,
    required: meta.required,
  }
}

/**
 * Оборачивает `form.Field` (`@tanstack/vue-form`) — валидатор из подсхемы поля, извлечение
 * первой ошибки в строку (Zod возвращает объект `{ message }` либо голую строку в зависимости
 * от версии/пути валидации). `render` получает уже разобранное состояние, не сырой field API
 * TanStack — эту часть у `createField`/`createFieldPrimitives` тоже дублировать не пришлось бы.
 */
export function withFieldValidation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Form API `@tanstack/vue-form`
  form: any,
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-подсхема без публичного .shape в типах
  fieldSchema: any,
  // `VNode | string | null`, не строго `VNode` — потребители с более широким узлом рендера
  // (например `UINode` в forms-vue-shadcn, тот же набор вариантов) передают свою render-функцию
  // без приведения типов. Возврат самой `withFieldValidation` всегда `VNode` (обёртка `form.Field`
  // из `h()`) и от типа `render` не зависит.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form field API
  render: (field: any, hasError: boolean, errorMessage: string) => VNode | string | null,
): VNode {
  return h(
    form.Field,
    { name, validators: fieldSchema ? { onChange: fieldSchema } : undefined },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form field slot-параметр
      default: ({ field }: { field: any }) => {
        const errors = (field.state.meta.errors ?? []) as unknown[]
        const hasError = errors.length > 0
        const firstError = errors[0] as { message?: string } | string | undefined
        const errorMessage = hasError
          ? typeof firstError === 'string' ? firstError : firstError?.message ?? ''
          : ''

        return render(field, hasError, errorMessage)
      },
    },
  )
}

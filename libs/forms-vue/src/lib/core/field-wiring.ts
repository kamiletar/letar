import { getFieldMeta, unwrapSchema } from '@letar/forms-core/schema'
import { h, type VNode } from 'vue'
import type { ZodType } from 'zod'
import { useFormGroup } from './form-group'

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
  /**
   * Полный dot-путь поля с учётом вложенного `FormGroup` (`"info.base.title"`, если поле лежит
   * в `<FormGroup name="info"><FormGroup name="base">...`, иначе равен переданному `name`).
   * Передавать именно его, а не исходный `name`/`props.name`, вторым аргументом
   * `withFieldValidation` — иначе `FormGroup` не даёт эффекта: TanStack Form свяжет значение
   * поля с плоским путём вместо вложенного.
   */
  fullPath: string
}

/**
 * Навигация к подсхеме поля по (возможно) вложенному dot-пути (`"info.base.title"`) — тот же
 * путь, что строит `FormGroup` (`useFormGroup()`). Разворачивает optional/nullable/default между
 * уровнями через `unwrapSchema`, иначе `.shape` объекта-обёртки недоступен. Только object-вложенность
 * (`FormGroup` не поддерживает массивы) — этого достаточно для Этапа 6.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-объект без публичного .shape в типах
function getNestedFieldSchema(schema: ZodType, path: string): any {
  const parts = path.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-объект без публичного .shape в типах
  let current: any = schema
  for (const part of parts) {
    current = unwrapSchema(current)
    current = current?.shape?.[part]
  }
  return current
}

/**
 * `name` — исходный (не префиксованный) проп поля, как раньше. Вложенность `FormGroup`
 * учитывается здесь же, один раз для всех вызывающих: читает `useFormGroup()` (Vue `inject`,
 * поэтому `resolveFieldMeta` обязана вызываться синхронно из `setup()` компонента поля — как и
 * вызывается везде в этом пакете, ни разу изнутри render-замыкания) и строит `fullPath`. Отдельно
 * встраивать вычисление `fullPath` в каждый из ~50 файлов `field-*.ts` не потребовалось —
 * `getFieldMeta` и так поддерживает вложенные пути (`@letar/forms-core/schema`), а подсхему для
 * валидатора резолвит `getNestedFieldSchema` ниже.
 */
export function resolveFieldMeta(
  schema: ZodType,
  name: string,
  label: string | undefined,
  placeholder: string | undefined,
): ResolvedFieldMeta {
  const parentGroup = useFormGroup()
  const fullPath = parentGroup ? `${parentGroup.name}.${name}` : name

  const meta = getFieldMeta(schema, fullPath)
  const fieldSchema = getNestedFieldSchema(schema, fullPath)

  return {
    fieldSchema,
    label: label ?? meta.ui?.title,
    placeholder: placeholder ?? meta.ui?.placeholder,
    required: meta.required,
    fullPath,
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

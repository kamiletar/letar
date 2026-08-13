import { getFieldMeta, unwrapSchema } from '@letar/forms-core/schema'
import type { ZodType } from 'zod'

/**
 * Angular-эквивалент `ResolvedFieldMeta`/`resolveFieldMeta` (`@letar/forms-vue`,
 * `field-wiring.ts`) — читает UI-метаданные (`.meta({ ui: {...} })`) и подсхему поля из той же
 * `getFieldMeta`/`unwrapSchema` (`@letar/forms-core/schema`), **без единой правки** в
 * `forms-core` под Angular. Это и есть предмет пруфа: framework-free ядро читается идентично
 * в третьем, максимально другом по модели рантайме (compiler-based, DI, сигналы).
 *
 * Вложенность `FormGroup` (как в Vue-версии, `fullPath`) в этом пруфе не реализована —
 * вне заявленного скоупа (headless, ~10 плоских полей, разведка границы, не полный порт).
 */
export interface ResolvedFieldMeta {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-подсхема без публичного .shape в типах
  fieldSchema: any
  label: string | undefined
  placeholder: string | undefined
  required: boolean
}

export function resolveFieldMeta(
  schema: ZodType | undefined,
  name: string,
  label: string | undefined,
  placeholder: string | undefined,
): ResolvedFieldMeta {
  if (!schema) {
    return { fieldSchema: undefined, label, placeholder, required: false }
  }

  const meta = getFieldMeta(schema, name)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-объект без публичного .shape в типах
  const fieldSchema = unwrapSchema((schema as any)?.shape?.[name])

  return {
    fieldSchema,
    label: label ?? meta.ui?.title,
    placeholder: placeholder ?? meta.ui?.placeholder,
    required: meta.required,
  }
}

'use client'

import type { SchemaFieldInfo } from '@letar/forms-core/schema'
import { traverseSchema } from '@letar/forms-core/schema'
import { useDeclarativeForm, useFormGroup } from '@letar/forms-react'
import type { ReactElement } from 'react'
import type { BaseFieldProps } from './types'
import { FieldCheckbox } from './field-checkbox'
import { FieldDate } from './field-date'
import { FieldNativeSelect } from './field-native-select'
import { FieldNumber } from './field-number'
import { FieldString } from './field-string'
import { FieldSwitch } from './field-switch'
import { FieldTextarea } from './field-textarea'

/** Конфигурация авто-детекции для `Form.Field.Auto` (shadcn-скин). */
export interface AutoFieldConfig {
  /** Использовать Switch вместо Checkbox для boolean (по умолчанию false) */
  booleanAsSwitch?: boolean
  /** Использовать Textarea для длинных строк по `maxLength` из схемы (по умолчанию true) */
  useTextareaForLongStrings?: boolean
  /** Порог длины для Textarea (по умолчанию 200) */
  textareaThreshold?: number
}

/** Props для Form.Field.Auto (shadcn-скин). */
export interface AutoFieldProps extends BaseFieldProps {
  /** Конфигурация авто-детекции */
  config?: AutoFieldConfig
}

function findFieldByPath(fields: SchemaFieldInfo[], path: string): SchemaFieldInfo | undefined {
  const parts = path.split('.')
  let current = fields
  for (let i = 0; i < parts.length; i++) {
    const found = current.find((f) => f.name === parts[i])
    if (!found) {
      return undefined
    }
    if (i === parts.length - 1) {
      return found
    }
    if (found.children) {
      current = found.children
    } else {
      return undefined
    }
  }
  return undefined
}

/** camelCase → "Читаемая метка". */
export function camelCaseToLabel(str: string): string {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
}

/**
 * Form.Field.Auto — shadcn-скин. Автоопределение типа поля из Zod-схемы.
 *
 * Портирован из Chakra-версии. Beta-упрощение: без диспетчеризации по `meta.fieldType`
 * (`renderFieldByType` — свободный маппинг на ~50 типов полей Chakra-скина) — только базовый
 * Zod-тип определяет компонент (string/number/boolean/date/enum), тот же fallback-путь, что
 * `renderFieldByType` использовал бы в отсутствие явного `fieldType` в meta.
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   firstName: z.string(),
 *   age: z.number(),
 *   isActive: z.boolean(),
 *   role: z.enum(['admin', 'user', 'guest']),
 * })
 *
 * <Form.Field.Auto name="firstName" />  // → FieldString, label="First Name"
 * <Form.Field.Auto name="age" />        // → FieldNumber
 * <Form.Field.Auto name="isActive" />   // → FieldCheckbox
 * <Form.Field.Auto name="role" />       // → FieldNativeSelect с опциями
 * ```
 */
export function FieldAuto({ name, config, ...baseProps }: AutoFieldProps): ReactElement {
  const { schema } = useDeclarativeForm()
  const parentGroup = useFormGroup()

  if (!name) {
    throw new Error('Form.Field.Auto requires a name prop')
  }

  const fullPath = parentGroup ? `${parentGroup.name}.${name}` : name
  const fieldInfo = findFieldByPath(traverseSchema(schema), fullPath)

  const label = baseProps.label ?? fieldInfo?.ui?.title ?? camelCaseToLabel(name)
  const { booleanAsSwitch = false, useTextareaForLongStrings = true, textareaThreshold = 200 } = config ?? {}

  switch (fieldInfo?.zodType) {
    case 'string': {
      const maxLength = fieldInfo.constraints?.string?.maxLength
      if (useTextareaForLongStrings && maxLength && maxLength > textareaThreshold) {
        return <FieldTextarea name={name} label={label} {...baseProps} />
      }
      return <FieldString name={name} label={label} {...baseProps} />
    }

    case 'number':
    case 'bigint':
    case 'int':
    case 'float':
      return <FieldNumber name={name} label={label} {...baseProps} />

    case 'boolean':
      if (booleanAsSwitch) {
        return <FieldSwitch name={name} label={label} {...baseProps} />
      }
      return <FieldCheckbox name={name} label={label} {...baseProps} />

    case 'date':
      return <FieldDate name={name} label={label} {...baseProps} />

    case 'enum':
      if (fieldInfo.enumValues) {
        const options = fieldInfo.enumValues.map((value) => ({ label: camelCaseToLabel(value), value }))
        return <FieldNativeSelect name={name} label={label} options={options} {...baseProps} />
      }
      return <FieldString name={name} label={label} {...baseProps} />

    default:
      return <FieldString name={name} label={label} {...baseProps} />
  }
}

FieldAuto.displayName = 'FieldAuto'

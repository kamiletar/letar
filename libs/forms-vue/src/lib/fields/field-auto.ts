import type { SchemaFieldInfo } from '@letar/forms-core/schema'
import { traverseSchema } from '@letar/forms-core/schema'
import { defineComponent, h } from 'vue'
import { useAppFormContext } from '../core/form-context'
import { useFormGroup } from '../core/form-group'
import { FieldCheckbox } from './field-checkbox'
import { FieldDate } from './field-date'
import { FieldInput } from './field-input'
import { FieldNativeSelect } from './field-native-select'
import { FieldNumber } from './field-number'
import { FieldSwitch } from './field-switch'
import { FieldTextarea } from './field-textarea'

function findFieldByPath(fields: SchemaFieldInfo[], path: string): SchemaFieldInfo | undefined {
  const parts = path.split('.')
  let current = fields
  for (let i = 0; i < parts.length; i++) {
    const found = current.find((f) => f.name === parts[i])
    if (!found) { return undefined }
    if (i === parts.length - 1) { return found }
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
 * Автоопределение типа поля из Zod-схемы. Портирован из `forms-shadcn/field-auto.tsx`: та же
 * beta-упрощённая диспетчеризация по базовому Zod-типу (string/number/boolean/date/enum), без
 * `renderFieldByType`-маппинга на ~50 типов Chakra-версии.
 */
export const FieldAuto = defineComponent({
  name: 'FieldAuto',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    booleanAsSwitch: { type: Boolean, required: false, default: false },
    useTextareaForLongStrings: { type: Boolean, required: false, default: true },
    textareaThreshold: { type: Number, required: false, default: 200 },
  },
  setup(props) {
    const { schema } = useAppFormContext()
    const parentGroup = useFormGroup()
    const fullPath = parentGroup ? `${parentGroup.name}.${props.name}` : props.name
    const fieldInfo = findFieldByPath(traverseSchema(schema), fullPath)
    const label = props.label ?? fieldInfo?.ui?.title ?? camelCaseToLabel(props.name)

    return () => {
      switch (fieldInfo?.zodType) {
        case 'string': {
          const maxLength = fieldInfo.constraints?.string?.maxLength
          if (props.useTextareaForLongStrings && maxLength && maxLength > props.textareaThreshold) {
            return h(FieldTextarea, { name: props.name, label })
          }
          return h(FieldInput, { name: props.name, label })
        }
        case 'number':
        case 'bigint':
        case 'int':
        case 'float':
          return h(FieldNumber, { name: props.name, label })
        case 'boolean':
          return props.booleanAsSwitch
            ? h(FieldSwitch, { name: props.name, label })
            : h(FieldCheckbox, { name: props.name, label })
        case 'date':
          return h(FieldDate, { name: props.name, label })
        case 'enum':
          if (fieldInfo.enumValues) {
            const options = fieldInfo.enumValues.map((value) => ({ value, label: camelCaseToLabel(value) }))
            return h(FieldNativeSelect, { name: props.name, label, options })
          }
          return h(FieldInput, { name: props.name, label })
        default:
          return h(FieldInput, { name: props.name, label })
      }
    }
  },
})

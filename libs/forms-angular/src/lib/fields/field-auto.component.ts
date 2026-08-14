import { Component, computed, inject, Input } from '@angular/core'
import type { SchemaFieldInfo } from '@letar/forms-core/schema'
import { traverseSchema } from '@letar/forms-core/schema'
import { FormRootService } from '../core/form-root.service'
import { FieldCheckboxComponent } from './field-checkbox.component'
import { FieldDateComponent } from './field-date.component'
import { FieldNativeSelectComponent, type FieldNativeSelectOption } from './field-native-select.component'
import { FieldNumberComponent } from './field-number.component'
import { FieldStringComponent } from './field-string.component'
import { FieldSwitchComponent } from './field-switch.component'
import { FieldTextareaComponent } from './field-textarea.component'

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

/** camelCase → "Читаемая метка". Совпадает 1:1 с `@letar/forms-vue` (`field-auto.ts`). */
export function camelCaseToLabel(str: string): string {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
}

type AutoFieldKind = 'string' | 'textarea' | 'number' | 'switch' | 'checkbox' | 'date' | 'select'

/**
 * Автоопределение типа поля из Zod-схемы — Angular-эквивалент `FieldAuto` (`@letar/forms-vue`,
 * `field-auto.ts`), та же beta-упрощённая диспетчеризация по базовому Zod-типу
 * (string/number/boolean/date/enum), без `renderFieldByType`-маппинга на ~50 типов Chakra-версии.
 *
 * ## Почему не наследует `FieldBase`
 *
 * `FieldAuto` не регистрирует свой `FormControl` — он рендерит ОДИН из существующих `Field*`
 * компонентов (`letar-field-string`/`-number`/`-checkbox`/...), и именно тот компонент регистрирует
 * контрол через свой собственный `FieldBase.control`. Это тот же принцип, что в Vue-версии
 * (`h(FieldInput, {...})` вместо собственной регистрации) — здесь выражен через `@switch` в
 * шаблоне вместо `render`-функции, поскольку Angular не рендерит компоненты динамически по
 * строковому имени без `NgComponentOutlet` (сознательно не используется — статичный список
 * известных кандидатов читается декларативно и проще в тестах).
 */
@Component({
  selector: 'letar-field-auto',
  standalone: true,
  imports: [
    FieldStringComponent,
    FieldTextareaComponent,
    FieldNumberComponent,
    FieldSwitchComponent,
    FieldCheckboxComponent,
    FieldDateComponent,
    FieldNativeSelectComponent,
  ],
  template: `
    @switch (kind()) {
      @case ('textarea') {
        <letar-field-textarea [name]="name" [label]="resolvedLabel()" />
      }
      @case ('number') {
        <letar-field-number [name]="name" [label]="resolvedLabel()" />
      }
      @case ('switch') {
        <letar-field-switch [name]="name" [label]="resolvedLabel()" />
      }
      @case ('checkbox') {
        <letar-field-checkbox [name]="name" [label]="resolvedLabel()" />
      }
      @case ('date') {
        <letar-field-date [name]="name" [label]="resolvedLabel()" />
      }
      @case ('select') {
        <letar-field-native-select [name]="name" [label]="resolvedLabel()" [options]="enumOptions()" />
      }
      @default {
        <letar-field-string [name]="name" [label]="resolvedLabel()" />
      }
    }
  `,
})
export class FieldAutoComponent {
  @Input({ required: true })
  name!: string
  @Input()
  label?: string
  @Input()
  booleanAsSwitch = false
  @Input()
  useTextareaForLongStrings = true
  @Input()
  textareaThreshold = 200

  private readonly formRoot = inject(FormRootService)

  protected readonly fieldInfo = computed<SchemaFieldInfo | undefined>(() => {
    const schema = this.formRoot.schema()
    if (!schema) {
      return undefined
    }
    return findFieldByPath(traverseSchema(schema), this.name)
  })

  protected readonly resolvedLabel = computed(
    () => this.label ?? this.fieldInfo()?.ui?.title ?? camelCaseToLabel(this.name),
  )

  protected readonly kind = computed<AutoFieldKind>(() => {
    const info = this.fieldInfo()
    switch (info?.zodType) {
      case 'string': {
        const maxLength = info.constraints?.string?.maxLength
        if (this.useTextareaForLongStrings && maxLength && maxLength > this.textareaThreshold) {
          return 'textarea'
        }
        return 'string'
      }
      case 'number':
      case 'bigint':
      case 'int':
      case 'float':
        return 'number'
      case 'boolean':
        return this.booleanAsSwitch ? 'switch' : 'checkbox'
      case 'date':
        return 'date'
      case 'enum':
        return info.enumValues ? 'select' : 'string'
      default:
        return 'string'
    }
  })

  protected readonly enumOptions = computed<FieldNativeSelectOption[]>(() => {
    const values = this.fieldInfo()?.enumValues ?? []
    return values.map((value) => ({ value, label: camelCaseToLabel(value) }))
  })
}

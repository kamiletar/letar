import type { Component } from 'vue'
import { CheckboxDemo } from './checkbox-demo'
import { ComboboxDemo } from './combobox-demo'
import { NumberDemo } from './number-demo'
import { SelectDemo } from './select-demo'
import { StringDemo } from './string-demo'
import { TextareaDemo } from './textarea-demo'

/**
 * Реестр примеров демо-харнесса — один пункт на файл в `examples/`. `App.ts` строит навигацию по
 * этому списку, form-docs (Этап 1 P7) будет читать те же файлы напрямую с диска.
 */
export interface DemoExample {
  id: string
  title: string
  component: Component
}

export const demoExamples: DemoExample[] = [
  { id: 'string', title: 'FieldString', component: StringDemo },
  { id: 'number', title: 'FieldNumber', component: NumberDemo },
  { id: 'select', title: 'FieldSelect', component: SelectDemo },
  { id: 'combobox', title: 'FieldCombobox', component: ComboboxDemo },
  { id: 'textarea', title: 'FieldTextarea', component: TextareaDemo },
  { id: 'checkbox', title: 'FieldCheckbox', component: CheckboxDemo },
]

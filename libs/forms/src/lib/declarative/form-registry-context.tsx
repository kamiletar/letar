'use client'

import { type ComponentType, createContext, useContext } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>

/**
 * Реестр компонентов `createForm`: те же объекты, что свойства инстанса (`AppForm.Select`, `AppForm.Combobox`,
 * `AppForm.Listbox`). Нужен автоформам — `Form.AutoFields` и `Form.Field.Auto` находят по нему компонент, на который
 * схема ссылается ключом `form.fieldType = 'Select.WorkCategory'` (§17.3).
 */
export interface FormRegistry {
  Select: Record<string, AnyComponent>
  Combobox: Record<string, AnyComponent>
  Listbox: Record<string, AnyComponent>
}

/** `null` — форма не из `createForm` (просто `Form`): ключей реестра у неё нет */
export const FormRegistryContext = createContext<FormRegistry | null>(null)

/** Реестр `createForm` текущей формы; `null` вне инстанса */
export function useFormRegistry(): FormRegistry | null {
  return useContext(FormRegistryContext)
}

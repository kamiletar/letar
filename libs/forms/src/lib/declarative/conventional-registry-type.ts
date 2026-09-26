'use client'

import { parseFieldRegistryType } from '@letar/forms-core/schema'
import { useFormRegistry } from './form-registry-context'
import type { FieldComponentType, FieldUIMeta } from './types/meta-types'

/**
 * Автоподбор компонента реестра `createForm` по имени модели/enum (§17.9, этап Ж).
 *
 * Плагин пишет в мету поля `registryName` (имя модели из `@relation` или имя enum). Если явного `fieldType` нет и в
 * реестре инстанса есть `Select.<registryName>` — возвращается ключ `Select.<registryName>` (дальше поле рисуется как
 * при явном ключе этапа Е). Нет компонента, нет реестра (форма не из `createForm`) или неверное имя — `undefined`:
 * поле рисуется как раньше, без ошибки и предупреждения. Подбираются только `Select.*`; `Combobox.*`/`Listbox.*` —
 * лишь по явному ключу.
 */
export function useConventionalRegistryType(ui: FieldUIMeta | undefined): FieldComponentType | undefined {
  const registry = useFormRegistry()
  return resolveConventionalRegistryType(ui, registry?.Select)
}

/** Чистая часть выбора: нужна и там, где хук недоступен, и тестам */
export function resolveConventionalRegistryType(
  ui: FieldUIMeta | undefined,
  selects: Record<string, unknown> | undefined,
): FieldComponentType | undefined {
  if (!ui?.registryName || ui.fieldType || !selects) {
    return undefined
  }
  const type = `Select.${ui.registryName}`
  // Имя должно быть допустимым ключом реестра (`Select.WorkCategory`), иначе — как будто подсказки нет
  if (!parseFieldRegistryType(type)) {
    return undefined
  }
  return Object.prototype.hasOwnProperty.call(selects, ui.registryName) ? (type as FieldComponentType) : undefined
}

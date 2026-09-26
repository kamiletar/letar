/** Пространства реестра createForm, на которые можно сослаться из схемы */
export type FieldRegistryNamespace = 'Select' | 'Combobox' | 'Listbox'

/** Ссылка на компонент реестра createForm: `'Select.WorkCategory'` */
export type FieldRegistryType = `${FieldRegistryNamespace}.${string}`

/**
 * Грамматика ссылки: `Пространство.Имя`, имя с заглавной — допустимое свойство инстанса createForm.
 * Та же регулярка у `@letar/zenstack-form-plugin` (сверяется тестами E1 и P1).
 */
const FIELD_REGISTRY_TYPE_PATTERN = /^(Select|Combobox|Listbox)\.([A-Z][A-Za-z0-9]*)$/

/** Разбор ссылки на реестр; `null` — встроенный тип или неверный синтаксис */
export function parseFieldRegistryType(
  fieldType: string,
): { namespace: FieldRegistryNamespace; key: string } | null {
  const match = FIELD_REGISTRY_TYPE_PATTERN.exec(fieldType)
  if (!match) {
    return null
  }
  return { namespace: match[1] as FieldRegistryNamespace, key: match[2] as string }
}

'use client'

import type { FieldRegistryNamespace } from '@letar/forms-core/schema'
import type { ReactElement } from 'react'
import type { FieldRenderProps } from './field-type-mapper'
import { useFormRegistry } from './form-registry-context'
import type { FieldComponentType } from './types/meta-types'

export interface RegistryFieldProps {
  /** Ссылка, разобранная из `fieldType`: `Select.WorkCategory` → `{ namespace: 'Select', key: 'WorkCategory' }` */
  reference: { namespace: FieldRegistryNamespace; key: string }
  /** Пропсы поля так же, как у `renderFieldByType` */
  fieldRenderProps: FieldRenderProps
  /** Встроенный тип для production-фолбэка (`Select.` → `select`) — рисуется тем же маппером */
  renderBuiltin: (type: FieldComponentType) => ReactElement
}

/** Встроенный тип на случай отсутствия ключа в реестре: пространство → базовое поле */
const BUILTIN_BY_NAMESPACE: Record<FieldRegistryNamespace, FieldComponentType> = {
  Select: 'select',
  Combobox: 'combobox',
  Listbox: 'listbox',
}

/** Ключи, о которых `console.error` уже сказал в production: один раз на ключ, не на каждый рендер */
const reportedMissingKeys = new Set<string>()

/** Только для тестов: забыть, о каких ключах уже сообщено */
export function resetReportedRegistryKeys(): void {
  reportedMissingKeys.clear()
}

/** dev-сборка или тесты: строгий режим (исключение), иначе — фолбэк. Не признак «прод против staging» — см. env-files.md */
function isDevOrTest(): boolean {
  const env = typeof process === 'undefined' ? undefined : process.env.NODE_ENV
  return env === 'development' || env === 'test'
}

/**
 * Поле со ссылкой на реестр `createForm`: `fieldType = 'Select.WorkCategory'` → компонент `AppForm.Select.WorkCategory`.
 * Компонент справочника грузит данные сам (хуки, окно создания, `useSelected`) — опции провайдера ему не передаются.
 *
 * Нет ключа в реестре (или формы не из `createForm`): в dev и тестах — исключение с перечнем доступных ключей, в production —
 * один `console.error` на ключ и базовое поле по пространству, чтобы одна пропущенная регистрация не гасила страницу.
 */
export function RegistryField({ reference, fieldRenderProps, renderBuiltin }: RegistryFieldProps): ReactElement {
  const registry = useFormRegistry()
  const { namespace, key } = reference
  const Component = registry?.[namespace][key]

  if (Component) {
    const { name, label, placeholder, helperText, required, disabled, readOnly, fieldProps } = fieldRenderProps
    // Служебный `relation` в компонент не распыляем: справочник грузит данные сам
    const { relation, ...rest } = fieldProps ?? {}
    if (relation !== undefined && isDevOrTest()) {
      console.warn(
        `Form field "${name}": form.relation.* is ignored — the registry key ${namespace}.${key} wins (the component loads its own data).`,
      )
    }
    return (
      <Component
        name={name}
        label={label}
        placeholder={placeholder}
        helperText={helperText}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        {...rest}
      />
    )
  }

  const type = `${namespace}.${key}`
  const message = registry
    ? `Поле "${fieldRenderProps.name}": ключ ${type} не найден в реестре createForm. Есть: ${
      Object.keys(registry[namespace]).join(', ') || '— (реестр пуст)'
    }. Добавьте его в ${
      namespace === 'Select'
        ? 'extraSelects или lazySelects'
        : namespace === 'Combobox'
        ? 'extraComboboxes или lazyComboboxes'
        : 'extraListboxes или lazyListboxes'
    }.`
    : `Поле "${fieldRenderProps.name}": ключ реестра ${type} работает только в форме createForm-инстанса.`

  if (isDevOrTest()) {
    throw new Error(message)
  }

  if (!reportedMissingKeys.has(type)) {
    reportedMissingKeys.add(type)
    console.error(message)
  }
  return renderBuiltin(BUILTIN_BY_NAMESPACE[namespace])
}

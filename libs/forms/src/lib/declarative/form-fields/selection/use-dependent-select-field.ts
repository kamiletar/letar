'use client'

import { getFieldMeta, resolveEmptyValue } from '@letar/forms-core/schema'
import type { DependentFieldProps, FieldDeps } from '@letar/forms-core/uikit'
import {
  type DependentFieldState,
  getLocalizedValue,
  useDeclarativeFormOptional,
  useDependentField,
  useFieldLabelLookup,
  useFormI18n,
} from '@letar/forms-react'
import { type ReactNode, useCallback, useId } from 'react'
import { useSelectionString } from './selection-field-strings'

export interface UseDependentSelectFieldOptions {
  /** Полный путь поля в форме */
  fullPath: string
  /** Метка самого поля (для объявления очистки); узел, не строка — берётся имя поля */
  label: ReactNode
  /** Тип значения поля: у числового Select пустое значение `0`, у остальных `''` (у nullable-схемы — всегда `null`) */
  valueType?: 'string' | 'number'
}

export interface DependentSelectFieldState<TDeps extends FieldDeps = FieldDeps> extends DependentFieldState<TDeps> {
  /** Пустое значение при очистке — автоочисткой и собственной кнопкой поля: `null` у nullable-схемы, иначе `''`/`0` */
  emptyValue: string | number | null
  /** `id` подсказки под полем — идёт в `aria-describedby` триггера */
  hintId: string
  /** Подсказка «Сначала выберите «Страна»» — пусто, когда поле не заблокировано */
  hint: string
  /** Текст в заблокированном поле: `placeholderWhenDisabled` или та же подсказка; `undefined` — не заблокировано */
  blockedPlaceholder: string | undefined
  /** Объявление автоочистки для скринридера — пусто, пока очистки не было */
  announcement: string
}

function lastSegment(path: string): string {
  const index = path.lastIndexOf('.')
  return index === -1 ? path : path.slice(index + 1)
}

/**
 * Зависимость поля Select/Combobox (§18) целиком: `useDependentField` (подписка на родителей, очистка по правке,
 * блокировка) + тексты для пользователя — подсказка под заблокированным полем и объявление очистки. Метка родителя —
 * его видимая подпись (`label`), иначе `ui.title` схемы формы (с переводом), иначе имя поля. Вызывается из `useFieldState` поля.
 */
export function useDependentSelectField<TDeps extends FieldDeps = FieldDeps>(
  props: DependentFieldProps<TDeps>,
  { fullPath, label, valueType }: UseDependentSelectFieldOptions,
): DependentSelectFieldState<TDeps> {
  const schema = useDeclarativeFormOptional()?.schema
  const emptyValue = resolveEmptyValue(schema, fullPath, valueType)
  const i18n = useFormI18n()
  const hintTemplate = useSelectionString('formSelection.dependsOnHint')
  const clearedTemplate = useSelectionString('formSelection.dependentCleared')
  const hintId = useId()

  // Подпись родителя, как её видит пользователь, — из реестра подписей полей формы; затем `ui.title` схемы
  const form = useDeclarativeFormOptional()?.form
  const lookupLabel = useFieldLabelLookup(form)
  // Идентичность важна: `useFieldDeps` пересчитывает состояние при её смене
  const getParentLabel = useCallback(
    (path: string): string | undefined => {
      const registered = lookupLabel(path)
      if (registered) {
        return registered
      }
      const ui = getFieldMeta(schema, path).ui
      const title = getLocalizedValue(i18n, ui?.i18nKey, 'title', ui?.title)
      return typeof title === 'string' && title !== '' ? title : undefined
    },
    [schema, i18n, lookupLabel],
  )

  const state = useDependentField<TDeps>({
    fullPath,
    dependsOn: props.dependsOn,
    depsReady: props.depsReady,
    clearOnParentChange: props.clearOnParentChange,
    disableWhenParentEmpty: props.disableWhenParentEmpty,
    emptyValue,
    getParentLabel,
  })

  const hint = state.blocked ? hintTemplate.replace('{parent}', state.missingParentLabels.join(', ')) : ''
  const fieldLabel = typeof label === 'string' && label !== '' ? label : lastSegment(fullPath)
  const announcement = state.cleared
    ? clearedTemplate.replace('{field}', fieldLabel).replace('{parent}', state.cleared.parentLabel)
    : ''

  return {
    ...state,
    emptyValue,
    hintId,
    hint,
    blockedPlaceholder: state.blocked ? props.placeholderWhenDisabled ?? hint : undefined,
    announcement,
  }
}

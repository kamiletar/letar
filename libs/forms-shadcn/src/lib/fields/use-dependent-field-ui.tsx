'use client'

import { resolveStaticFormText } from '@letar/forms-core/i18n'
import { getFieldMeta, resolveEmptyValue } from '@letar/forms-core/schema'
import type { DependentFieldProps, FieldDeps } from '@letar/forms-core/uikit'
import {
  type DependentFieldState,
  useDeclarativeFormOptional,
  useDependentField,
  useFieldLabelLookup,
  useFormI18n,
} from '@letar/forms-react'
import { type ReactElement, type ReactNode, useCallback, useId } from 'react'

/** Ключи i18n зависимых полей (общие с Chakra-скином: `formSelection.*`) */
type DependentStringKey = 'formSelection.dependsOnHint' | 'formSelection.dependentCleared'

/**
 * Встроенный словарь. Язык по умолчанию — русский, как у остальных строк shadcn-скина («Загрузка...», «Изменить»):
 * без `FormI18nProvider` поле не превращается в англоязычное посреди русской формы. Провайдер с `t` или `locale`
 * (ru/en) переопределяет — тем же порядком, что `resolveStaticFormText`.
 */
const BUILTIN_STRINGS: Record<DependentStringKey, Record<string, string>> = {
  'formSelection.dependsOnHint': { en: 'First select “{parent}”', ru: 'Сначала выберите «{parent}»' },
  'formSelection.dependentCleared': {
    en: '“{field}” cleared: “{parent}” changed',
    ru: 'Поле «{field}» очищено: изменилось поле «{parent}»',
  },
}

const DEFAULT_LOCALE = 'ru'

function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => params[name] ?? '')
}

function resolveString(
  i18n: ReturnType<typeof useFormI18n>,
  key: DependentStringKey,
  params: Record<string, string>,
): string {
  const dict = BUILTIN_STRINGS[key]
  const builtin = (locale: string) => interpolate(dict[locale.split('-')[0] ?? locale] ?? dict[DEFAULT_LOCALE]!, params)
  // Без провайдера — русский (см. выше); с провайдером — общая лестница: перевод приложения → словарь по локали
  return i18n ? resolveStaticFormText(i18n, key, builtin, params) : builtin(DEFAULT_LOCALE)
}

export interface DependentFieldUiOptions<TDeps extends FieldDeps> extends DependentFieldProps<TDeps> {
  /** Полный путь поля в форме */
  fullPath: string
  /** Подпись самого поля — для объявления об очистке */
  label: ReactNode
  /** Пустое значение, которое пишет автоочистка: то же, что пишет собственная кнопка очистки поля */
  /** Тип значения: у числового Select пустое значение `0`, у остальных `''` (у nullable-схемы — всегда `null`) */
  valueType?: 'string' | 'number'
}

export interface DependentFieldUi<TDeps extends FieldDeps> {
  /** Состояние из `useDependentField`: `deps`, `depsKey`, `ready`, `blocked`, `cleared`… */
  state: DependentFieldState<TDeps>
  /** Пустое значение при очистке: `null` у nullable-схемы, иначе `''`/`0` */
  emptyValue: string | number | null
  /** Есть `dependsOn` */
  active: boolean
  deps: TDeps
  depsKey: string
  ready: boolean
  /** Поле заблокировано: родители не готовы */
  blocked: boolean
  /** Placeholder заблокированного поля: `placeholderWhenDisabled` либо «Сначала выберите «Страна»» */
  blockedPlaceholder: string | undefined
  /** Id видимой подсказки — для `aria-describedby` */
  hintId: string
  /** Видимая подсказка «Сначала выберите «Страна»» (`null` — поле не заблокировано) */
  hintText: string | null
  /** Текст для live-области: «Поле «Город» очищено: изменилось поле «Страна»» (пусто — очистки не было) */
  liveMessage: string
}

/**
 * Зависимое поле (§18) для скина shadcn: `useDependentField` (подписка на родителей, регистрация в реестре
 * зависимостей формы, автоочистка по правке родителя) плюс тексты и разметка a11y — общие для Select и Combobox.
 * Вызывать из `useFieldState` поля. Без `dependsOn` возвращает нейтральное состояние: поле не блокируется,
 * подсказок нет.
 */
export function useDependentFieldUi<TDeps extends FieldDeps = FieldDeps>(
  options: DependentFieldUiOptions<TDeps>,
): DependentFieldUi<TDeps> {
  const { fullPath, label, valueType, dependsOn, depsReady, clearOnParentChange, disableWhenParentEmpty } = options
  const i18n = useFormI18n()
  const schema = useDeclarativeFormOptional()?.schema
  // Очистка (автоматическая и собственная кнопка поля) пишет `null` у nullable-схемы, иначе `''`/`0`
  const emptyValue = resolveEmptyValue(schema, fullPath, valueType)
  const hintId = useId()

  // Метка родителя: видимая подпись поля (`label`), иначе `ui.title` схемы, иначе последний сегмент имени поля
  // (умолчание хука). Подпись поля важнее `ui.title`: пользователь видит именно её
  const form = useDeclarativeFormOptional()?.form
  const lookupLabel = useFieldLabelLookup(form)
  const getParentLabel = useCallback(
    (path: string): string | undefined => {
      const registered = lookupLabel(path)
      if (registered) {
        return registered
      }
      const title = getFieldMeta(schema, path).ui?.title
      return typeof title === 'string' && title ? title : undefined
    },
    [schema, lookupLabel],
  )

  const state = useDependentField<TDeps>({
    fullPath,
    dependsOn,
    depsReady,
    clearOnParentChange,
    disableWhenParentEmpty,
    emptyValue,
    getParentLabel,
  })

  const blocked = state.blocked
  const parentsText = state.missingParentLabels.join('», «')
  const hint = blocked ? resolveString(i18n, 'formSelection.dependsOnHint', { parent: parentsText }) : null
  const fieldLabel = typeof label === 'string' && label ? label : (fullPath.split('.').pop() ?? fullPath)
  const liveMessage = state.cleared
    ? resolveString(i18n, 'formSelection.dependentCleared', {
      field: fieldLabel,
      parent: state.cleared.parentLabel,
    })
    : ''

  return {
    state,
    emptyValue,
    active: state.active,
    deps: state.deps,
    depsKey: state.depsKey,
    ready: state.ready,
    blocked,
    blockedPlaceholder: blocked ? options.placeholderWhenDisabled ?? hint ?? undefined : undefined,
    hintId,
    hintText: hint,
    liveMessage,
  }
}

/**
 * Подсказка под заблокированным полем — как `helperText` (без сдвига раскладки): `<span id>` внутри абзаца
 * `FieldError`. Пока на поле показана ошибка валидации, подсказки нет — тогда и `aria-describedby` не ставится.
 */
export function dependentHelperText(
  ui: DependentFieldUi<FieldDeps>,
  hasError: boolean,
): { helperText: ReactNode | undefined; describedBy: string | undefined } {
  if (!ui.hintText || hasError) {
    return { helperText: undefined, describedBy: undefined }
  }
  return {
    helperText: (
      <span id={ui.hintId} data-slot="dependent-hint">
        {ui.hintText}
      </span>
    ),
    describedBy: ui.hintId,
  }
}

/**
 * Вежливая live-область: объявляет, что значение очищено из-за смены родителя. Рендерится всегда, пока у поля есть
 * `dependsOn` — область должна быть в DOM до появления текста, иначе скринридер молчит. Обновление списка не
 * объявляется (шум при каждой смене).
 */
export function DependentLiveRegion({ ui }: { ui: DependentFieldUi<FieldDeps> }): ReactElement | null {
  if (!ui.active) {
    return null
  }
  return (
    <span className="sr-only" aria-live="polite" aria-atomic="true" data-dependent-live="">
      {ui.liveMessage}
    </span>
  )
}
